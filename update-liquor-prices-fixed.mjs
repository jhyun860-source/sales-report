import mysql from 'mysql2/promise';
import { URL } from 'url';

const priceData = [
  { name: '바톤 보드카', price: 7000 },
  { name: '바톤 진', price: 7000 },
  { name: '럼', price: 8000 },
  { name: '메론 리큐르', price: 21000 },
  { name: '피치 리큐르', price: 20000 },
  { name: '아마레토', price: 24800 },
  { name: '얼그레이 시럽', price: 20000 },
  { name: '그레나딘', price: 20000 },
  { name: '모히토 시럽', price: 20000 },
  { name: '자몽시럽', price: 20000 },
  { name: '청포도시럽', price: 20000 },
  { name: '수박시럽', price: 20000 },
  { name: '앙고스투라', price: 60000 },
  { name: '마티니 드라이', price: 19000 },
  { name: '드럼부이', price: 42800 },
  { name: '말리부', price: 28000 },
  { name: '몬테주마 (데킬라)', price: 18000 },
  { name: '깔루아', price: 30000 },
  { name: '베일리스', price: 40000 },
  { name: '트리플섹', price: 22000 },
  { name: '바나나 리큐르', price: 22000 },
  { name: '블루큐라소', price: 22000 },
  { name: '라임주스', price: 20000 },
  { name: '피나믹스', price: 20000 },
  { name: '론디아즈', price: 30000 },
  { name: '발렌타인 17y (500ml)', price: 114000 },
  { name: '발렌타인 21y (500ml)', price: 180000 },
  { name: '발렌타인 30y', price: 934800 },
  { name: '발렌타인 마스터즈', price: 50000 },
  { name: '글렌버기 12y (700ml)', price: 92400 },
  { name: '글렌버기 15y (700ml)', price: 130000 },
  { name: '글렌리벳 12y (700ml)', price: 97000 },
  { name: '글렌리벳 15y (700ml)', price: 140000 },
  { name: '글랜피딕 12y (500ml)', price: 70000 },
  { name: '글랜피딕 15y (500ml)', price: 98000 },
  { name: '글랜피딕 12y (700ml)', price: 90000 },
  { name: '글랜피딕 15y (700ml)', price: 125000 },
  { name: '글랜모렌지 오리지널', price: 85000 },
  { name: '글랜모렌지 라산타 12y', price: 106000 },
  { name: '글랜모렌지 시그넷', price: 340000 },
  { name: '발베니 12y (700ml)', price: 110000 },
  { name: '발베니 14y (700ml)', price: 180000 },
  { name: '로얄살루트 21y (500ml)', price: 180000 },
  { name: '로얄살루트 21y (700ml)', price: 296000 },
  { name: '조니워커 블랙 (500ml)', price: 40000 },
  { name: '조니워커 블루 (500ml)', price: 210000 },
  { name: '조니워커 블루 (700ml)', price: 300000 },
  { name: '맥켈란 12y (700ml)', price: 110000 },
  { name: '맥켈란 15y (700ml)', price: 220000 },
  { name: '맥켈란 18y (700ml)', price: 450000 },
  { name: '올드캐슬', price: 20000 },
  { name: '칼라일 (700ml)', price: 20000 },
  { name: '캔터키 (700ml)', price: 20000 },
  { name: '스틸브룩 디럭스', price: 20000 },
  { name: '존바 파이니스트', price: 20000 },
  { name: '탈리스만', price: 20000 },
  { name: '글렌라씨', price: 20000 },
  { name: '엠페라도르', price: 20000 },
  { name: '코쿤위스키 (2.7L)', price: 40000 },
  { name: '미스터보스턴 버번 1L', price: 20000 },
  { name: '멈 그랑꼬르동', price: 71000 },
  { name: '멈 그랑꼬르동 로제', price: 92000 },
  { name: '모엣샹동', price: 74000 },
  { name: '모엣샹동 로제', price: 92000 },
  { name: '모엣샹동 매그넘', price: 170000 },
  { name: '돔페리뇽', price: 360000 },
  { name: '돔페리뇽 빈티지', price: 450000 },
  { name: '아르망디', price: 650000 },
  { name: '헤네시 x.o', price: 360000 },
  { name: '헤네시 v.s.o.p (500ml)', price: 90000 },
  { name: '레미마틴 v.s.o.p', price: 110000 },
  { name: '시바스리갈 12y', price: 53000 },
  { name: '골든블루', price: 30000 },
  { name: '1800 아네호', price: 90000 },
  { name: '아드백 10y', price: 120000 },
  { name: '탈리스커 10y', price: 90000 },
  { name: '달모어 12y', price: 120000 },
  { name: '달모어 킹', price: 500000 },
  { name: '카발란', price: 99000 },
  { name: '맥코넬스', price: 85000 },
  { name: '히비키 하모니', price: 300000 },
  { name: '얼리타임즈', price: 30000 },
  { name: '야마자키', price: 500000 },
  { name: '아줄 레포사도 (데킬라)', price: 400000 },
  { name: '카프리', price: 1700 },
  { name: '호가든', price: 2200 },
  { name: '하이네켄', price: 3300 },
  { name: '코로나', price: 2450 },
  { name: '기네스', price: 4600 },
  { name: '생맥주 1통', price: 100000 },
];

async function updatePrices() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL 환경변수가 없습니다');
    process.exit(1);
  }

  const url = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  let updated = 0;
  let notFound = [];

  for (const item of priceData) {
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM liquorItems WHERE name = ?',
        [item.name]
      );
      
      if (rows.length > 0) {
        await connection.execute(
          'UPDATE liquorItems SET unitCost = ? WHERE name = ?',
          [item.price, item.name]
        );
        updated++;
        console.log(`✅ ${item.name}: ₩${item.price.toLocaleString()}`);
      } else {
        notFound.push(item.name);
        console.log(`❌ 찾을 수 없음: ${item.name}`);
      }
    } catch (error) {
      console.error(`오류: ${item.name}`, error.message);
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`업데이트됨: ${updated}개`);
  if (notFound.length > 0) {
    console.log(`찾을 수 없음: ${notFound.length}개`);
    notFound.forEach(name => console.log(`  - ${name}`));
  }

  await connection.end();
}

updatePrices().catch(console.error);
