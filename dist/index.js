"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware to parse JSON with FHIR content types and larger limit
app.use(express_1.default.json({
    limit: '10mb',
    type: ['application/json', 'application/fhir+json']
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.get('Content-Type'));
    next();
});
// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    next();
});
// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'FHIR Path API is running!',
        endpoints: {
            '/fhirpath': 'POST - Evaluate FHIRPath expressions',
            '/health': 'GET - Health check'
        }
    });
});
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 FHIR Path API server is running on port ${PORT}`);
    console.log(`📍 Access the API at http://localhost:${PORT}`);
    console.log(`📖 API documentation available at http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map