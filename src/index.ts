import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { processFhirPathRequest } from './fhirpath-service';
import { CreateOperationOutcome } from './utils';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON with FHIR content types and larger limit
app.use(express.json({
    limit: '10mb',
    type: ['application/json', 'application/fhir+json']
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`)
    console.log('Headers:', req.headers)
    console.log('Content-Type:', req.get('Content-Type'))
    next()
})

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.statusCode = 200
        res.end()
        return
    }
    next()
})

// Routes
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'FHIR Path API is running!',
        endpoints: {
            '/fhirpath': 'POST - Evaluate FHIRPath expressions',
            '/health': 'GET - Health check'
        }
    });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// FHIRPath evaluation
app.post('/$fhirpath-r5', async (req: Request, res: Response) => {
    await processFhirPathRequest(req, res);
});


// Start server
app.listen(PORT, () => {
    console.log(`🚀 FHIR Path API server is running on port ${PORT}`);
    console.log(`📍 Access the API at http://localhost:${PORT}`);
    console.log(`📖 API documentation available at http://localhost:${PORT}`);
});

export default app;
