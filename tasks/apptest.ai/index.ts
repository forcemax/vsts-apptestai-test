import tl = require('azure-pipelines-task-lib/task');
import fs = require('fs');
import request = require('request');
import c = require('ansi-colors');
import {wait} from './wait'

function execute_test(accesskey:string, projectid:string, packagefile:string, testsetname:string) {
    var auth_token = accesskey.split(':');
  
    return new Promise<string>((resolve, reject) => {
        const options = {
            method: "POST",
            url: "https://api.apptest.ai/openapi/v1/test/run",
            port: 443,
            auth: {
                user: auth_token[0],
                pass: auth_token[1]
            },
            headers: {
                "Content-Type": "multipart/form-data"
            },
            formData : {
                "apk_file": fs.createReadStream(packagefile),
                "data": "{\"pid\":"+String(projectid)+", \"test_set_name\":\""+testsetname+"\"}"
            }
        };
  
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else {
                if (error) {
                    reject(new Error("Test initiation failed."));
                } else {
                    reject(new Error("HTTP status code : " + String(response.statusCode)));
                }
            }
        });
    });
}

function check_finish(accesskey:string, projectid:string, ts_id:number) {
    var auth_token = accesskey.split(':');
  
    return new Promise<string>((resolve, reject) => {
        const options = {
            method: "GET",
            url: "https://api.apptest.ai/openapi/v1/project/"+String(projectid)+"/testset/" + String(ts_id) + "/result/all",
            port: 443,
            auth: {
                user: auth_token[0],
                pass: auth_token[1]
            }
        };
  
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else {
                if (error) {
                    reject(new Error("Check finish failed."));
                } else {
                    reject(new Error("HTTP status code : " + String(response.statusCode)));
                }
            }
        });
    });
}  

function get_result(json_string:string, error_only:boolean=false) {
    var result = JSON.parse(json_string);
    var outputTable = "\n";
    outputTable += '+-----------------------------------------------------------------+\n';
    outputTable += '|                        Device                        |  Result  |\n';
    outputTable += '+-----------------------------------------------------------------+\n';
  
    var testcases = result.testsuites.testsuite[0].testcase;
    testcases.forEach((element:any) => {
        if (error_only && ! ('error' in element))
            return;
        outputTable += '| ' + element.name.padEnd(52) + ' |  ' + ('error' in element ? c.red('Failed') : c.green('Passed')) + '  |\n';
        if (error_only && 'error' in element) 
            outputTable += '| ' + element.error.message + '\n';
    });
    outputTable += '+-----------------------------------------------------------------+\n';
  
    return outputTable;
}

function get_error_in_json(json_string:string) {
    let result = JSON.parse(json_string);
    let errors = new Array();
    
    var testcases = result.testsuites.testsuite[0].testcase;
    testcases.forEach((element:any) => {
        if ('error' in element) {
            errors.push(element);
        }
    });
  
    return errors;
}

function clear_commit_message(commit_message: string) {
    let ret_message = commit_message;
    try {
        if (ret_message.length > 99) {
            ret_message = ret_message.substr(0,99)
        }
        
        if (ret_message.indexOf('\n') !== -1) {
            ret_message = ret_message.substr(0, ret_message.indexOf('\n'));
        }

        return ret_message;
    } catch (error) {
        return undefined;
    }    
}
  
async function run() {
    try {
        let running = true;
        const accesskey: string | undefined = tl.getInput('access_key', true);
        const projectid: string | undefined =  tl.getInput('project_id', true);
        const binarypath: string | undefined = tl.getInput('binary_path', true);

        if (!accesskey) {
            throw Error("access_key is required parameter.");
        }
      
        if (!projectid) {
            throw Error("project_id is required parameter.");
        }
      
        if (!binarypath) {
            throw Error("binary_path is required parameter.");
        }
      
        if (!fs.existsSync(binarypath)) {
            throw Error("binary_path file not exists.")
        }
      
        let testsetname: string | undefined = tl.getInput('test_set_name');
        if (!testsetname) {
            testsetname = tl.getVariable("Build.SourceVersionMessage");
            if (testsetname) {
                testsetname = clear_commit_message(testsetname);
            } else {
                testsetname = tl.getVariable("Build.SourceVersion");
            }
        }

        let ts_id;
        try {
            let http_promise_execute = execute_test(accesskey, projectid, binarypath, String(testsetname));
            let resp = await http_promise_execute;
    
            if (!resp) {
                throw Error("Test initiation failed: no response.");
            }
            let ret = JSON.parse(resp);
            if (!('tsid' in ret['data'])) {
                throw Error("Test initialize failed: invalid response.");
            }
            ts_id = ret['data']['tsid'];

            console.log(" Test initiated.");
        } catch(error) {
          // Promise rejected
          throw Error(error);
        }
    
        var step_count = 0;
        var retry_count = 0;
        while(running) {
            // wait for next try
            await wait(15000);
            step_count = step_count + 1;
            console.log(" Test is progressing... " + String(step_count * 15) + "sec.");
            
            try {
                let http_promise_check = check_finish(accesskey, projectid, ts_id);
                let resp = await http_promise_check;
        
                if (!resp) {
                    throw Error("Test progress check failed : no response. retry!");
                }
    
                let ret = JSON.parse(resp);
                if (ret['complete'] == true) {
                    console.log(" Test finished.");
            
                    var errors = get_error_in_json(ret['data']['result_json']);
                    if (errors) {
                        var output_table = get_result(ret['data']['result_json']);
                        console.log(output_table);
            
                        if (errors.length > 0) {
                            c.enabled = false;
                            var output_error = get_result(ret['data']['result_json'], true);
                            tl.setResult(tl.TaskResult.Failed, output_error);
                        }
                    }
        
                    running = false;
                }
                retry_count = 0;
            } catch(error) {
                console.error(error);
                retry_count = retry_count + 1;
                if (retry_count > 3) {
                    throw Error('over 3 retry. failed.');
                } else {
                    continue;
                }
            }
        }
    }
    catch (error) {
        tl.setResult(tl.TaskResult.Failed, error);
    }
}
module.exports = {get_error_in_json, get_result, execute_test, check_finish, clear_commit_message};
if (require.main === module) {
  run();
}