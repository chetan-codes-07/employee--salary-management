import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSalary,salaryDecimal} from '../server/money';
test('decimal salary conversion is exact at minor-unit boundaries',()=>{for(const [input,expected] of [['0.01',1],['0.29',29],['1.1',110],['1234567.89',123456789],['100000000.00',10000000000]] as const){assert.equal(parseSalary(input),expected);assert.equal(parseSalary(salaryDecimal(expected)),expected);}});
test('reject invalid, ambiguous and out-of-range salaries',()=>{for(const value of ['',null,100,[],{},'0','0.00','-1','1e6','NaN','Infinity','1.001','1,000','₹100',' 10','10 ','+10','01.00','.5','100000000.01','99999999999'])assert.throws(()=>parseSalary(value),JSON.stringify(value));});
