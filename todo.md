# TODO

- [x] Accept Parameters for Model Generation
  - Added support to accept parameters, e.g., `--modelname user`, to dynamically generate files for the specified model.

- [x] CamelCase Prisma Models
  - Ensured that Prisma models are camelCased in the service file for consistency with naming conventions.

- [x] Async Service Methods
  - Updated service methods to be asynchronous to handle operations that require I/O or other async tasks.

- [x] Controller Endpoints with Default Swagger Docs
  - Configured controller endpoints to include default Swagger documentation for better API clarity and testing.

- [x] Excluded IDs and Timestamps from DTOs
  - Modified DTOs to exclude `id` fields and timestamp information to simplify data transfer objects.

- [x] Dynamic Class-Validator Imports
  - Implemented dynamic imports for class-validator to optimize performance and reduce initial load times.

- [x] Export Resources on Demand
  - Updated the module to export resources on demand rather than generating files for the entire database.

- [ ] Add Newly Created Module to App Module
  - Integrate newly created modules into the `app.module.ts` to ensure they are properly registered and functional within the application.

- [ ] Parse Prisma Comments as Class-Validator Validators
  - Investigate and implement functionality to parse comments in Prisma schema files and use them as validators in class-validator.
