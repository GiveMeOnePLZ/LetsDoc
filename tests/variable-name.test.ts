import assert from 'node:assert/strict';
import test from 'node:test';
import { VALID_VARIABLE_NAME } from '../src/utils/constants.ts';

test('accepts visible punctuation in variable names', () => {
  for (const name of [
    '甲方名称（全称）',
    '金额（元）',
    '合同编号/日期',
    '联系人-手机',
    '收款账号:开户地址',
    '项目.名称',
    '地址 详细信息',
  ]) {
    assert.equal(VALID_VARIABLE_NAME.test(name), true, name);
  }
});

test('rejects placeholder delimiters and control characters', () => {
  for (const name of ['姓名{别名', '姓名}别名', '姓名\n别名', '姓名\u0000别名']) {
    assert.equal(VALID_VARIABLE_NAME.test(name), false, name);
  }
});
