#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AppsyncMongoTestStack } from '../lib/appsync-mongo-test-stack'

const app = new cdk.App()
new AppsyncMongoTestStack(app, 'AppsyncMongoTestStack', {
	env: {
		account: '521776702104',
		region: 'us-east-1',
	},
})
