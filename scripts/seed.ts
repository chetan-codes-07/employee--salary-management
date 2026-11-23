import { openLocal } from '../server/database';
import {migrate} from '../server/migrate';
import {seed} from '../server/seed-data';
const local=openLocal();
try {migrate(local.db);await seed(local.sql);const [row]=await local.sql.all<{count:number}>('SELECT COUNT(*) AS count FROM employees');if(row.count!==10_000)throw new Error(`Expected 10000 employees, found ${row.count}`);console.log(`Seed complete: ${row.count} fictional employees (existing edits preserved).`);}finally{local.close();}
