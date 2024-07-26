## nestjs-prisma-crud

- it is very boring to do the same repetitive crud endpoints for each resource, when they all follow the same format. nestjs provides a way to generate a resource which is orm agnostic. This will be opinionated and will use your prisma schema to generate your resources. All resource will be generated in the src directory

- you can then step in and add any business logic


## run for one or more models
- make clean && ts-node index.ts ModelName1 ModelName2 

## run for all models
- make clean && ts-node index.ts 

### paginations
- All entities have a search class that extend the search query and we all also paginations utils, below is their shape

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from "class-transformer";
import { IsNumber, Min, Max, IsString, IsDateString } from "class-validator";

export function pagination(currentPage: number, pageSize: number): { take: number, skip: number } {

    const take = pageSize ? +pageSize : 100;
    const skip = (currentPage - 1) * pageSize;

    return {
        take,
        skip
    }

}


export function getPagingData(data: { count: number, rows: any[] }, currentPage: number, pageSize: number) {

    const { count: totalItems, rows: results } = data;


    const totalPages = Math.ceil(totalItems / pageSize)
    const nextPage = currentPage + 1 > totalPages ? null : currentPage + 1;
    const hasPreviousPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;

    return {
        totalItems,
        results,
        totalPages,
        currentPage,
        hasNextPage,
        hasPreviousPage,
        nextPage
    }

}


export class ResultsPaginated<T> {
    @ApiProperty()
    totalItems: number;

    @ApiProperty({ type: [Object], example: [] })
    results: T[];

    @ApiProperty()
    totalPages: number;

    @ApiProperty()
    currentPage: number;

    @ApiProperty()
    hasNextPage: boolean;

    @ApiProperty()
    hasPreviousPage: boolean;

    @ApiProperty()
    nextPage: number | null;
}


export class SearchQuery {
    @ApiProperty({ default: 1 })
    @Type(() => Number)
    page: number;

    @ApiProperty({ default: 100 })
    @IsNumber()
    @Min(0)
    @Max(1000)
    @Type(() => Number)
    limit: number;
}


export class ReportQuery {
   
    @IsString()
    @IsDateString()
    @ApiProperty({ default: new Date().toISOString() })
    startDate: string
    
    @IsString()
    @IsDateString()
    @ApiProperty({ default: new Date().toISOString() })
    endDate: string
   
}


```

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



