#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { program } = require("commander");

program
  .command("resource <name>")
  .description("Generate a new resource")
  .action((name) => {
    generateResource(name);
  });

program.parse(process.argv);

function generateResource(name) {
  const resourceDir = path.join(__dirname, "src", name);
  if (!fs.existsSync(resourceDir)) {
    fs.mkdirSync(resourceDir, { recursive: true });
  }

  const files = [
    { template: "module.template", target: `${name}.module.ts` },
    { template: "controller.template", target: `${name}.controller.ts` },
    { template: "service.template", target: `${name}.service.ts` },
    {
      template: "dto/create-dto.template",
      target: `dto/create-${name}.dto.ts`,
    },
    {
      template: "dto/update-dto.template",
      target: `dto/update-${name}.dto.ts`,
    },
  ];

  files.forEach((file) => {
    const templatePath = path.join(__dirname, "templates", file.template);
    const targetPath = path.join(resourceDir, file.target);
    const content = fs
      .readFileSync(templatePath, "utf-8")
      .replace(/__NAME__/g, name);
    fs.writeFileSync(targetPath, content);
  });

  console.log(`Resource ${name} generated successfully.`);
}
