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

function getServiceBaseUrl(request: HttpRequest): string {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedProto && forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    const originMatch = request.url.match(/^https?:\/\/[^/]+/i);
    if (originMatch?.[0]) {
        return originMatch[0];
    }

    return 'http://localhost:7071';
}

async function labConfigHandler(request: HttpRequest): Promise<HttpResponseInit> {
    const serviceBaseUrl = getServiceBaseUrl(request);
    const resolvedConfig = {
        ...configRust,
        local_r5: `${serviceBaseUrl}/$rust-r5`
    };

    return {
        status: 200,
        jsonBody: resolvedConfig
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
