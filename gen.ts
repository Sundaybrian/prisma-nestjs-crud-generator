import { Project } from 'ts-morph';
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

// Generate DTOs
const generateDtos = async () => {
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

        // Create a source file for the DTO
        const sourceFile = project.createSourceFile(`src/dtos/Create${modelName}Dto.ts`, {}, { overwrite: true });

        // Define DTO class
        sourceFile.addClass({
            name: `Create${modelName}Dto`,
            isExported: true,
            properties: modelBody.split('\n').map((line) => {
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

                const decorators = [
                    isOptional && { name: 'IsOptional', arguments: [] },
                    { name: decorator, arguments: [] },
                ].filter(Boolean);

                if (isArray) {
                    decorators.push({ name: 'IsArray', arguments: [] });
                }

                return {
                    name,
                    type: tsType + (isArray ? '[]' : ''),
                    hasQuestionToken: isOptional,
                    decorators,
                };
            }).filter(Boolean), // Filter out null values
        });

        // Add class-validator imports
        sourceFile.addImportDeclaration({
            namedImports: ['IsOptional', 'IsString', 'IsInt', 'IsBoolean', 'IsDate', 'IsNumber', 'IsObject', 'IsArray'],
            moduleSpecifier: 'class-validator',
        });

        // Save the source file
        sourceFile.saveSync();
    });
};

// Run the script
generateDtos()
    .then(() => {
        console.log('DTOs generated successfully.');
    })
    .catch((error) => {
        console.error('Error generating DTOs:', error);
    });
