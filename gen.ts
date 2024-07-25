import { Project, OptionalKind, DecoratorStructure } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

// Utility function to convert Prisma types to TypeScript types and corresponding class-validator decorators
const prismaTypeToTsTypeAndDecorator = (prismaType: string) => {
    switch (prismaType) {
        case 'String':
            return { tsType: 'string', decorator: 'IsString' };
        case 'Int':
            return { tsType: 'number', decorator: 'IsInt' };
        case 'Boolean':
            return { tsType: 'boolean', decorator: 'IsBoolean' };
        case 'DateTime':
            return { tsType: 'Date', decorator: 'IsDate' };
        case 'Float':
            return { tsType: 'number', decorator: 'IsNumber' };
        case 'Decimal':
            return { tsType: 'number', decorator: 'IsNumber' };
        case 'Json':
            return { tsType: 'any', decorator: 'IsObject' };
        default:
            return { tsType: 'any', decorator: 'IsObject' };
    }
};

// Generate DTOs and Entities
const generateDtosAndEntities = async () => {
    const schemaPath = path.resolve(__dirname, 'prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Extract models from the schema
    const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
    const models = [...schemaContent.matchAll(modelRegex)];

    // Initialize ts-morph project
    const project = new Project();

    models.forEach((model) => {
        const modelName = model[1];
        const modelBody = model[2];
        const modelFolderName = modelName.toLowerCase();
        const dtoFolderPath = path.join('src', modelFolderName, 'dto');
        const entityFolderPath = path.join('src', modelFolderName, 'entities');
        const searchFolderPath = path.join('src', modelFolderName);
        const serviceFolderPath = path.join('src', modelFolderName);
        const controllerFolderPath = path.join('src', modelFolderName);
        const moduleFolderPath = path.join('src', modelFolderName);

        // Ensure folders exist
        fs.mkdirSync(dtoFolderPath, { recursive: true });
        fs.mkdirSync(entityFolderPath, { recursive: true });
        fs.mkdirSync(searchFolderPath, { recursive: true });
        fs.mkdirSync(serviceFolderPath, { recursive: true });
        fs.mkdirSync(controllerFolderPath, { recursive: true });
        fs.mkdirSync(moduleFolderPath, { recursive: true });

        // Create source files for the DTOs
        const createDtoFile = project.createSourceFile(
            path.join(dtoFolderPath, `create-${modelName.toLowerCase()}.dto.ts`),
            {},
            { overwrite: true }
        );

        const updateDtoFile = project.createSourceFile(
            path.join(dtoFolderPath, `update-${modelName.toLowerCase()}.dto.ts`),
            {},
            { overwrite: true }
        );

        // Create source file for the entity
        const entityFile = project.createSourceFile(
            path.join(entityFolderPath, `${modelName.toLowerCase()}.entity.ts`),
            {},
            { overwrite: true }
        );

        // Define DTO classes
        const dtoProperties = modelBody.split('\n').map((line) => {
            line = line.trim();
            if (!line || line.startsWith('//')) {
                return null;
            }

            const [name, type] = line.split(/\s+/);
            if (!name || !type) {
                return null;
            }

            const { tsType, decorator } = prismaTypeToTsTypeAndDecorator(type.split('?')[0]);
            const isOptional = type.includes('?');
            const isArray = type.endsWith('[]');

            const classValidators: OptionalKind<DecoratorStructure>[] = [
                isOptional && { name: 'IsOptional', arguments: [] },
                { name: decorator, arguments: [] },
            ].filter(Boolean) as OptionalKind<DecoratorStructure>[];

            if (isArray) {
                classValidators.push({ name: 'IsArray', arguments: [] });
            }

            const swaggerDecorator: OptionalKind<DecoratorStructure> = {
                name: 'ApiProperty',
                arguments: [`{ required: ${!isOptional} }`],
            };

            return {
                name,
                type: tsType + (isArray ? '[]' : ''),
                hasQuestionToken: isOptional,
                classValidators,
                swaggerDecorator,
            };
        }).filter(Boolean); // Filter out null values

        // Create DTO class for Create operation
        createDtoFile.addClass({
            name: `Create${modelName}Dto`,
            isExported: true,
            properties: dtoProperties.map((prop) => ({
                name: prop.name,
                type: prop.type,
                hasQuestionToken: prop.hasQuestionToken,
                decorators: [...prop.classValidators, prop.swaggerDecorator],
            })),
        });

        // Create DTO class for Update operation using PartialType
        updateDtoFile.addClass({
            name: `Update${modelName}Dto`,
            isExported: true,
            extends: `PartialType(Create${modelName}Dto)`,
        });

        // Add class-validator and swagger imports
        createDtoFile.addImportDeclaration({
            namedImports: ['IsOptional', 'IsString', 'IsInt', 'IsBoolean', 'IsDate', 'IsNumber', 'IsObject', 'IsArray'],
            moduleSpecifier: 'class-validator',
        });
        createDtoFile.addImportDeclaration({
            namedImports: ['ApiProperty'],
            moduleSpecifier: '@nestjs/swagger',
        });

        updateDtoFile.addImportDeclaration({
            namedImports: ['PartialType'],
            moduleSpecifier: '@nestjs/swagger',
        });
        updateDtoFile.addImportDeclaration({
            namedImports: [`Create${modelName}Dto`],
            moduleSpecifier: `./create-${modelName.toLowerCase()}.dto`,
        });

        // Create entity class
        entityFile.addClass({
            name: `${modelName}Entity`,
            isExported: true,
            properties: dtoProperties.map((prop) => ({
                name: prop.name,
                type: prop.type,
                hasQuestionToken: prop.hasQuestionToken,
                decorators: [prop.swaggerDecorator],
            })),
        });

        // Add swagger import for entities
        entityFile.addImportDeclaration({
            namedImports: ['ApiProperty'],
            moduleSpecifier: '@nestjs/swagger',
        });


        // Service file creation
        const serviceFile = project.createSourceFile(
            path.join(serviceFolderPath, `${modelFolderName}.service.ts`),
            {},
            { overwrite: true }
        );

        serviceFile.addClass({
            name: `${modelName}Service`,
            isExported: true,
            decorators: [{ name: 'Injectable', arguments: [] }],
            ctors: [{
                parameters: [
                    { name: 'prisma', type: 'PrismaService', decorators: [{ name: 'Inject', arguments: ['PrismaService'] }] },
                ],
            }],
            methods: [
                {
                    name: 'create',
                    parameters: [
                        { name: 'createDto', type: `Create${modelName}Dto` },
                    ],
                    statements: `return this.prisma.${modelFolderName}.create({ data: createDto });`,
                },
                {
                    name: 'findAll',
                    parameters: [
                        { name: 'query', type: `${modelName}SearchQuery` },
                    ],
                    statements: `const filters: Prisma.${modelName}WhereInput = {};
                const page = +query.page || 1;
                const size = +query.limit || 10;

                Object.keys(query).forEach(key => {
                    if (!['limit', 'page'].includes(key)) {
                        filters[key] = { equals: query[key] }
                    }
                });

                const { take, skip } = pagination(page, size);
                const items = await this.prisma.${modelFolderName}.findMany({
                    where: filters,
                    skip,
                    take,
                });

                const count = await this.prisma.${modelFolderName}.count({ where: filters });
                return getPagingData({ count, rows: items }, page, size);`,
                },
                {
                    name: 'findOne',
                    parameters: [
                        { name: 'id', type: 'number' },
                    ],
                    statements: `return this.prisma.${modelFolderName}.findUnique({ where: { id } });`,
                },
                {
                    name: 'update',
                    parameters: [
                        { name: 'id', type: 'number' },
                        { name: 'updateDto', type: `Update${modelName}Dto` },
                    ],
                    statements: `return this.prisma.${modelFolderName}.update({ where: { id }, data: updateDto });`,
                },
                {
                    name: 'remove',
                    parameters: [
                        { name: 'id', type: 'number' },
                    ],
                    statements: `return this.prisma.${modelFolderName}.delete({ where: { id } });`,
                },
            ],
        });

        serviceFile.addImportDeclaration({
            namedImports: ['Injectable'],
            moduleSpecifier: '@nestjs/common',
        });
        serviceFile.addImportDeclaration({
            namedImports: ['PrismaService'],
            moduleSpecifier: 'src/prisma/prisma.service',
        });
        serviceFile.addImportDeclaration({
            namedImports: [`Create${modelName}Dto`],
            moduleSpecifier: `./dto/create-${modelFolderName}.dto`,
        });
        serviceFile.addImportDeclaration({
            namedImports: [`Update${modelName}Dto`],
            moduleSpecifier: `./dto/update-${modelFolderName}.dto`,
        });
        serviceFile.addImportDeclaration({
            namedImports: [`${modelName}SearchQuery`],
            moduleSpecifier: `./entities/${modelFolderName}.search`,
        });
        serviceFile.addImportDeclaration({
            namedImports: ['Prisma'],
            moduleSpecifier: '@prisma/client',
        });
        serviceFile.addImportDeclaration({
            namedImports: ['pagination', 'getPagingData'],
            moduleSpecifier: 'src/shared/paginations',
        });

        // Controller file creation
        const controllerFile = project.createSourceFile(
            path.join(controllerFolderPath, `${modelFolderName}.controller.ts`),
            {},
            { overwrite: true }
        );

        controllerFile.addClass({
            name: `${modelName}Controller`,
            isExported: true,
            decorators: [
                { name: 'Controller', arguments: [`'${modelFolderName}'`] },
                { name: 'ApiTags', arguments: [`'${modelFolderName}'`] },
            ],
            ctors: [{
                parameters: [
                    { name: `${modelFolderName}Service`, type: `${modelName}Service`, decorators: [{ name: 'Inject', arguments: [`${modelName}Service`] }] },
                ],
            }],
            methods: [
                {
                    name: 'create',
                    decorators: [{ name: 'Post', arguments: [] }],
                    parameters: [
                        { name: 'createDto', type: `Create${modelName}Dto`, decorators: [{ name: 'Body', arguments: [] }] },
                    ],
                    statements: `return this.${modelFolderName}Service.create(createDto);`,
                },
                {
                    name: 'findAll',
                    decorators: [{ name: 'Post', arguments: ['search'] }],
                    parameters: [
                        { name: 'query', type: `${modelName}SearchQuery`, decorators: [{ name: 'Body', arguments: [] }] },
                    ],
                    statements: `return this.${modelFolderName}Service.findAll(query);`,
                },
                {
                    name: 'findOne',
                    decorators: [{ name: 'Get', arguments: [':id'] }],
                    parameters: [
                        { name: 'id', type: 'string', decorators: [{ name: 'Param', arguments: ['id'] }] },
                    ],
                    statements: `return this.${modelFolderName}Service.findOne(+id);`,
                },
                {
                    name: 'update',
                    decorators: [{ name: 'Patch', arguments: [':id'] }],
                    parameters: [
                        { name: 'id', type: 'string', decorators: [{ name: 'Param', arguments: ['id'] }] },
                        { name: 'updateDto', type: `Update${modelName}Dto`, decorators: [{ name: 'Body', arguments: [] }] },
                    ],
                    statements: `return this.${modelFolderName}Service.update(+id, updateDto);`,
                },
                {
                    name: 'remove',
                    decorators: [{ name: 'Delete', arguments: [':id'] }],
                    parameters: [
                        { name: 'id', type: 'string', decorators: [{ name: 'Param', arguments: ['id'] }] },
                    ],
                    statements: `return this.${modelFolderName}Service.remove(+id);`,
                },
            ],
        });

        controllerFile.addImportDeclaration({
            namedImports: ['Controller', 'Post', 'Get', 'Patch', 'Delete', 'Body', 'Param'],
            moduleSpecifier: '@nestjs/common',
        });
        controllerFile.addImportDeclaration({
            namedImports: [`${modelName}Service`],
            moduleSpecifier: `./${modelFolderName}.service`,
        });
        controllerFile.addImportDeclaration({
            namedImports: [`Create${modelName}Dto`],
            moduleSpecifier: `./dto/create-${modelFolderName}.dto`,
        });
        controllerFile.addImportDeclaration({
            namedImports: [`Update${modelName}Dto`],
            moduleSpecifier: `./dto/update-${modelFolderName}.dto`,
        });
        controllerFile.addImportDeclaration({
            namedImports: [`${modelName}SearchQuery`],
            moduleSpecifier: `./entities/${modelFolderName}.search`,
        });

        // Module file creation
        const moduleFile = project.createSourceFile(
            path.join(moduleFolderPath, `${modelFolderName}.module.ts`),
            {},
            { overwrite: true }
        );

        moduleFile.addClass({
            name: `${modelName}Module`,
            isExported: true,
            decorators: [{
                name: 'Module',
                arguments: [`{
                imports: [],
                controllers: [${modelName}Controller],
                providers: [${modelName}Service],
            }`],
            }],
        });

        moduleFile.addImportDeclaration({
            namedImports: ['Module'],
            moduleSpecifier: '@nestjs/common',
        });
        moduleFile.addImportDeclaration({
            namedImports: [`${modelName}Service`],
            moduleSpecifier: `./${modelFolderName}.service`,
        });
        moduleFile.addImportDeclaration({
            namedImports: [`${modelName}Controller`],
            moduleSpecifier: `./${modelFolderName}.controller`,
        });

        // Save the source files
        createDtoFile.saveSync();
        updateDtoFile.saveSync();
        entityFile.saveSync();

        serviceFile.saveSync();
        controllerFile.saveSync();
        moduleFile.saveSync();

    });
};

// Run the script
generateDtosAndEntities()
    .then(() => {
        console.log('DTOs and Entities generated successfully.');
    })
    .catch((error) => {
        console.error('Error generating DTOs and Entities:', error);
    });
