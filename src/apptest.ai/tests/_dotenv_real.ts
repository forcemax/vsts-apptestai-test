import * as path from 'path';
import * as assert from 'assert';
import * as process from 'process';
import * as cp from 'child_process';
import 'path';

import * as dotenv from 'dotenv';

var index = require("../index");

const ts_id = "799632";

describe('Sample task tests', function () {
    this.timeout(600000);
    dotenv.config();

    before( function() {

    });

    after(() => {

    });

    it('input parameter check', async() => {
        const ip = path.join(__dirname, '../index.js');
        let output;
        try {
            output = cp.execSync(`node ${ip}`, {env: process.env}).toString();
        } catch (ex) {
            output = ex.stdout.toString();
        }
        console.log(output);
    });
    
    it('check complete', async() => {
        let http_promise_check = index.check_complete(process.env.INPUT_ACCESS_KEY, ts_id);
        let ret_check = await http_promise_check;
    
        console.log(ret_check);
    });

    it('get test result', async() => {
        let http_promise_check = index.get_test_result(process.env.INPUT_ACCESS_KEY, ts_id);
        let ret_check = await http_promise_check;
    
        console.log(ret_check);
    });

});
