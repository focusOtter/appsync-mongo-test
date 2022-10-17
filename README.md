# AWS AppSync to MongoDB Sample

## Purpose

This repo showcases how an AppSync API can use a pipeline resolver to access a MongoDB cluster via an HTTP datasource.

![/repo-images/appsync-mongodb.png](appsync to mongodb architecture diagram)

Before starting, install the applications dependencies by running the following command from the root of the directory:

```sh
npm install
```

Afterwards, change the `account` and `region` properties in the [bin file](./bin/appsync-mongo-test.ts) to match the account you wish to deploy to.

## Database Setup

![/repo-images/mongodb-setup.png](mongodb cluster)

1. Create a free [MongoDB Atlas cluster](https://www.mongodb.com/atlas/database)
   - Database Name: `RiskAssessment`
   - Collection Name: `Products`
2. Create a sample document via the MongoDB console that has the following shape:

```js
{
  "_id": "6344e739fa01055a8d5004b6",
  "name": "sampleName",
  "region": "US",
  "sector": "travel",
  "industry": "airlines/railway",
  "riskType": "CR",
  "owner": "mtliendo"
}
```

## Secrets Setup

This project makes use of the MongoDB Data API to allow requests to made via HTTP so long as an API Key is provided.

After creating an API Key in MongoDB, create a secret in Secrets Manager with the name `test/mongodbatlas/apikey` and the following value:

```js
{
	key: YOUR_API_KEY
}
```

Once created, use the ARN of that key to [replace the ARN on this line.](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/appsync-mongo-test-stack.ts#L50)

## Understanding Our AppSync API

### Schema

The schema for our AppSync API can be found [here](./lib/schema.graphql).

This uses a [public API key to authorize consumers](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/appsync-mongo-test-stack.ts#L15-L18) making queries. Essentially, an API customer can call the `getProduct` query given they supply a valid `id`.

### Understanding Pipeline Resolvers

Pipeline Resolver: [`BEFORE_STEP`, `FUNCTIONS`, `AFTER_STEP`]

A pipeline resolver consists of the following:

1. **`before`**: This is great to [stash variables](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/mappingTemplates/Pipeline.Before.req.vtl) for later use and general configuration. Variables `stash`ed here are made available to all subsequent functions.

2. **`functions`**: The buisiness logic goes here. This consists of one or many steps that include data manipulation and data gathering. We'll make use of an [HTTP resolver to get data](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/mappingTemplates/Query.getMongoSecret.req.vtl).

3. **`after`**: This is a chance to do some final data manipulation before [passing data back to AppSync](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/mappingTemplates/Pipeline.After.res.vtl)

In this project, the flow of data will be:

Pipeline Resolver:

```js
[
  **Stash variables**, //before
**Get API Key from Secrets Manager**, //fn 1
**Make request to MongoDB**, //fn 2
**Send data back to AppSync** //after
]
```

### HTTP DataSources

HTTP DataSources allow AppSync to call both [AWS services](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/appsync-mongo-test-stack.ts#L34-L44), as well as [3rd-party endpoints](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/appsync-mongo-test-stack.ts#L28-L32). In the case of an AWS service, requests are signed using the SigV4 signing method.

In addition, HTTP DataSources can only perform allowed actions to AWS services based on their [IAM permissions](https://github.com/focusOtter/appsync-mongo-test/blob/main/lib/appsync-mongo-test-stack.ts#L46-L54).

## Useful commands

> This project uses nodeJS runtime and NPM. As such, the AWS CDK is not installed globally. Instead, it is prefixed with `npx aws-cdk`.

- `npm install` install the applications dependencies
- `npm run build` compile typescript to js
- `npx aws-cdk deploy` deploy this stack to your default AWS account/region
- `npx aws-cdk destroy` delete the stack and associated resoures
