import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as appsync from '@aws-cdk/aws-appsync-alpha'
import * as path from 'path'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'

export class AppsyncMongoTestStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		//create our API
		const api = new appsync.GraphqlApi(this, 'AppSyncToMongoAPI', {
			name: 'AppSyncToMongoAPI',
			schema: appsync.Schema.fromAsset(path.join(__dirname, 'schema.graphql')),
			authorizationConfig: {
				defaultAuthorization: {
					authorizationType: appsync.AuthorizationType.API_KEY,
				},
			},
			logConfig: {
				fieldLogLevel: appsync.FieldLogLevel.ALL,
			},
			xrayEnabled: true,
		})

		// Create our 2 datasources

		// The MongoDB API
		const mongoDataAPIDS = api.addHttpDataSource(
			'mongoDBAtlasCluster',
			'https://data.mongodb-api.com'
		)

		// Secrets Manager
		const secretsManagerDS = api.addHttpDataSource(
			'secretsManager',
			'https://secretsmanager.us-east-1.amazonaws.com',
			{
				authorizationConfig: {
					signingRegion: 'us-east-1',
					signingServiceName: 'secretsmanager',
				},
			}
		)

		// policy to permit an http datasource to get a secret in Secrets Manager
		secretsManagerDS.grantPrincipal.addToPrincipalPolicy(
			new PolicyStatement({
				resources: [
					'arn:aws:secretsmanager:us-east-1:521776702104:secret:test/mongodbatlas/apikey-rf7Y8J',
				],
				actions: ['secretsmanager:GetSecretValue'],
			})
		)

		// Create a function that gets the secret
		const appSyncFunction = new appsync.AppsyncFunction(
			this,
			'getMongoSecretFunc',
			{
				api,
				dataSource: secretsManagerDS,
				name: 'getMongoSecretFromSSM',
				requestMappingTemplate: appsync.MappingTemplate.fromFile(
					path.join(__dirname, 'mappingTemplates/Query.getMongoSecret.req.vtl')
				),
				responseMappingTemplate: appsync.MappingTemplate.fromFile(
					path.join(__dirname, 'mappingTemplates/Query.getMongoSecret.res.vtl')
				),
			}
		)

		// Create a function that will get the Gifs from the API
		const getProductFunction = new appsync.AppsyncFunction(
			this,
			'getProductFromMongoFunc',
			{
				api,
				dataSource: mongoDataAPIDS,
				name: 'getProductFromMongo',
				requestMappingTemplate: appsync.MappingTemplate.fromFile(
					path.join(__dirname, 'mappingTemplates/Query.getProduct.req.vtl')
				),
				responseMappingTemplate: appsync.MappingTemplate.fromFile(
					path.join(__dirname, 'mappingTemplates/Query.getProduct.res.vtl')
				),
			}
		)

		// Create a pipeline that has a "before" and "after" step + our fns
		const myPipelineResolver = new appsync.Resolver(
			this,
			'getProductPipeline',
			{
				api,
				typeName: 'Query',
				fieldName: 'getProduct',
				requestMappingTemplate: appsync.MappingTemplate.fromFile(
					path.join(__dirname, 'mappingTemplates/Pipeline.Before.req.vtl')
				),
				pipelineConfig: [appSyncFunction, getProductFunction],
				responseMappingTemplate: appsync.MappingTemplate.fromFile(
					path.join(__dirname, 'mappingTemplates/Pipeline.After.res.vtl')
				),
			}
		)

		new cdk.CfnOutput(this, 'appsync api key', {
			value: api.apiKey!,
		})

		new cdk.CfnOutput(this, 'appsync endpoint', {
			value: api.graphqlUrl,
		})
	}
}
