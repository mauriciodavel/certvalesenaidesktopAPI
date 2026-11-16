import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { env } from '../config.js';
import { migrations } from '../schema.js';
for(const sql of migrations) await db.query(sql);
if(env.ADMIN_EMAIL&&env.ADMIN_PASSWORD){const hash=await bcrypt.hash(env.ADMIN_PASSWORD,12);await db.execute(`INSERT INTO users(email,password_hash,name,role) VALUES(?,?,?,'admin') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[env.ADMIN_EMAIL.toLowerCase(),hash,'Administrador']);console.log(`Administrador preparado: ${env.ADMIN_EMAIL}`);}
else console.log('Schema pronto. Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o primeiro administrador.');
await db.end();
