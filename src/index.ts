import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { processFhirPathRequest } from './fhirpath-service';
import configRust from './config.rust.json';
import { CreateOperationOutcome } from './utils';

const fhirJsonHeaders = {
    'Content-Type': 'application/fhir+json'
};

async function rustR5Handler(request: HttpRequest): Promise<HttpResponseInit> {
    try {
        const body = await request.json();
        return processFhirPathRequest(body);
    } catch {
        return {
            status: 400,
            headers: fhirJsonHeaders,
            jsonBody: CreateOperationOutcome('error', 'invalid', 'Request body is empty or malformed')
        };
    }
}

async function labConfigHandler(): Promise<HttpResponseInit> {
    return {
        status: 200,
        jsonBody: configRust
    };
}

app.http('rust-r5', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: '$rust-r5',
    handler: rustR5Handler
});

app.http('lab-config', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lab-config',
    handler: labConfigHandler
});
