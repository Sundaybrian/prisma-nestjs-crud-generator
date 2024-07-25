const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

// Path to your Prisma schema
const prismaSchemaPath = path.join(__dirname, "prisma/schema.prisma");

// Directory for generated files
const outputDir = path.join(__dirname, "generated");

// Read and parse Prisma schema
const schema = fs.readFileSync(prismaSchemaPath, "utf8");
const models = parsePrismaSchema(schema);

// Handlebars templates directory
const templatesDir = path.join(__dirname, "templates");

// Generate resources for each model
models.forEach((model) => generateResource(model));

function parsePrismaSchema(schema) {
  const modelRegex = /model (\w+) {([^}]+)}/g;
  const models = [];
  let match;

  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const modelFields = match[2]
      .trim()
      .split("\n")
      .map((line) => line.trim());
    models.push({ name: modelName, fields: modelFields });
  }

  return [models[0]];
}

function generateResource(model) {
  const modelName = model.name;
  const modelDir = path.join(outputDir, modelName);

  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  const resource = ["controller"]
  
  resource.forEach((templateName) => {
    const templatePath = path.join(templatesDir, `${templateName}.hbs`);
    const template = fs.readFileSync(templatePath, "utf8");
    const compiledTemplate = handlebars.compile(template);
    const result = compiledTemplate(model);

    fs.writeFileSync(
      path.join(modelDir, `${modelName}.${templateName}.ts`),
      result
    );
  });
}

console.log("Resources generated successfully.");
