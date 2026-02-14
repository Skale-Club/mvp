import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generic white label favicon - simple circle design
// This is a base64 encoded 32x32 PNG with a blue circle
const faviconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABa0lEQVR4nO2XS07DMBCG/0kqVogVl+AYHIErcAQuARfgEhyBK3AFbsAROAJLFqhSJRYgIfEzjhPHcRyn6QLxS5GitTPffDNjJxYmTJjwf0EIcQMgB/AE4BXAhRBiptvLOQAPRDQBYEXEt0T0AeBBt6+zyDlvEdErEW0B5ET0rOs9IuoS0TsR1XQ43jnnTU1kU0RdAGsiOtXlryLi1mH0FxH1NZk1IuoS0akhsqXLayLqEdFI11taEu2aSD9k9CdE1AOwoNs/aBIdAFd/kOhqIm0ietdE2kT0BeBSl18S0YKIRgAuiOiOiN50/UITWSJ6M0RWRPQJ4FqXXxNRV5fHRLRNRN8ALnX5FRHNdPlMt59r+4Mm0gZwpstvdPktgHld/qDtH4moQ0RjXT7S5VMiWjLtB/+cB0T0DEBpmv8S0RxAV5c/6fp7IlrW7R/p+k8ArwDO9HnPT/P+Cb8DdZiNqFbrdZ4AAAAASUVORK5CYII=';

const faviconBuffer = Buffer.from(faviconBase64, 'base64');
const faviconPath = path.join(__dirname, '..', 'client', 'public', 'favicon.png');

fs.writeFileSync(faviconPath, faviconBuffer);
console.log('✅ Generic white label favicon created at:', faviconPath);
