import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({DB_HOST:z.string().min(1),DB_PORT:z.coerce.number().int().default(4000),DB_USERNAME:z.string().min(1),DB_PASSWORD:z.string().min(1),DB_DATABASE:z.string().min(1),DB_SSL:z.enum(['true','false']).default('true'),JWT_SECRET:z.string().min(32),ALLOWED_ORIGINS:z.string().default(''),ADMIN_EMAIL:z.string().email().optional().or(z.literal('')),ADMIN_PASSWORD:z.string().min(12).optional().or(z.literal('')),NODE_ENV:z.enum(['development','test','production']).default('development')});
export const env=schema.parse(process.env);
