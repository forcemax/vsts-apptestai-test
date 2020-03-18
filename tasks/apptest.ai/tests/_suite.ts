import * as path from 'path';
import * as assert from 'assert';

var index = require("../index");

describe('Sample task tests', function () {

    before( function() {

    });

    after(() => {

    });

    it('should succeed with simple inputs', function(done: MochaDone) {
        // Add success test here
        let result_json:string = "{\"testsuites\": {\"testsuite\": [{\"testcase\": [{\"system-out\": {\"contents\": [\"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=883113\"]}, \"name\": \"SAMSUNG GALAXY_S8 / ANDROID 9\", \"time\": \"626\"}, {\"system-out\": {\"contents\": [\"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=883114\"]}, \"name\": \"SAMSUNG GALAXY_NOTE8 / ANDROID 9\", \"time\": \"652\"}, {\"system-out\": {\"contents\": [\"https://app.apptest.ai/#/main/testLab/tResult/summary/0?tid=883115\"]}, \"name\": \"XIAOMI Mi_A1 / ANDROID 9\", \"time\": \"615\"}], \"name\": \"trace android.TestBot\"}], \"name\": \"TestBot Test\"}}";
         
        console.log(index.get_result(result_json));
        done();
    });

    it('it should fail if tool returns 1', function(done: MochaDone) {
        // Add failure test here
        done();
    });    
});

