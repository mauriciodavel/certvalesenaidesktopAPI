import type{NextFunction,Request,Response}from'express';
import jwt from'jsonwebtoken';
import type{RowDataPacket}from'mysql2';
import{env}from'./config.js';
import{rows}from'./db.js';
export type SessionUser={id:number;email:string;name:string;role:'admin'|'viewer';mustChangePassword:boolean};
declare global{namespace Express{interface Request{user?:SessionUser}}}
export function createAccessToken(user:SessionUser){return jwt.sign(user,env.JWT_SECRET,{expiresIn:'8h',issuer:'certvale-api',audience:'certvale-clients'});}
export async function authenticate(req:Request,res:Response,next:NextFunction){try{const match=String(req.get('authorization')||'').match(/^Bearer\s+(.+)$/i);if(!match)return res.status(401).json({error:'Token de acesso ausente.'});const token=jwt.verify(match[1],env.JWT_SECRET,{issuer:'certvale-api',audience:'certvale-clients'})as SessionUser;const users=await rows<(RowDataPacket&{id:number;email:string;name:string;role:'admin'|'viewer';active:number;must_change_password:number})[]>('SELECT id,email,name,role,active,must_change_password FROM users WHERE id=? LIMIT 1',[token.id]);const user=users[0];if(!user||!user.active)return res.status(401).json({error:'Usuário inativo ou inexistente.'});req.user={id:user.id,email:user.email,name:user.name,role:user.role,mustChangePassword:Boolean(user.must_change_password)};next();}catch{res.status(401).json({error:'Token inválido ou expirado.'});}}
export function requireAdmin(req:Request,res:Response,next:NextFunction){if(req.user?.role!=='admin')return res.status(403).json({error:'Acesso restrito a administradores.'});next();}
export function requirePasswordChanged(req:Request,res:Response,next:NextFunction){if(req.user?.mustChangePassword)return res.status(403).json({error:'Altere sua senha temporária para continuar.'});next();}
