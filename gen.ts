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

        // Ensure folders exist
        fs.mkdirSync(dtoFolderPath, { recursive: true });
        fs.mkdirSync(entityFolderPath, { recursive: true });

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

        // Save the source files
        createDtoFile.saveSync();
        updateDtoFile.saveSync();
        entityFile.saveSync();
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
