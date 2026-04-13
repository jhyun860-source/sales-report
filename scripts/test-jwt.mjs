import { jwtVerify, SignJWT } from 'jose';
import dotenv from 'dotenv';
dotenv.config();

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);

// 테스트 토큰 생성
const token = await new SignJWT({ accountId: 1, loginId: 's1', role: 'user', type: 'store' })
  .setProtectedHeader({ alg: 'HS256' })
  .sign(secret);
console.log('Test token created OK');

// 검증
const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
console.log('Payload type:', payload.type);
console.log('JWT verification OK');
