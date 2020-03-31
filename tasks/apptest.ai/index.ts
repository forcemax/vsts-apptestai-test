import tl = require('azure-pipelines-task-lib/task');
import fs = require('fs');
import request = require('request');
import c = require('ansi-colors');
import {wait} from './wait'

function execute_test(accesskey:string, projectid:string, packagefile:string, params:any) {
    var auth_token = accesskey.split(':');
  
    return new Promise<string>((resolve, reject) => {
        let data = "";
        data += "{\"pid\": " + String(projectid);
        data += ", \"testset_name\": \""+params['testset_name']+"\"";
        if (params['time_limit']) {
          data += ", \"time_limit\": "+params['time_limit'];
        }
        if (params['use_vo']) {
          data += ", \"use_vo\": "+params['use_vo'];
        }
        if (params['callback']) {
          data += ", \"callback\": "+params['callback'];
        }
        if ('credentials' in params && params['credentials']['login_id'] && params['credentials']['login_pw']) {
          data += ", \"credentials\": { \"login_id\": \"" + params['credentials']['login_id'] + "\", \"login_pw\": \"" + params['params']['login_pw'] + "\"}";
        }
        data += "}";

        const options = {
            method: "POST",
            url: "https://api.apptest.ai/openapi/v2/testset",
            port: 443,
            auth: {
                user: auth_token[0],
                pass: auth_token[1]
            },
            headers: {
                "Content-Type": "multipart/form-data"
            },
            formData : {
                "app_file": fs.createReadStream(packagefile),
                "data": data
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

function check_complete(accesskey:string, ts_id:number) {
    var auth_token = accesskey.split(':');
  
    return new Promise<string>((resolve, reject) => {
        const options = {
            method: "GET",
            url: "https://api.apptest.ai/openapi/v2/testset/" + String(ts_id),
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

function get_test_result(accesskey:string, ts_id:number) {
    var auth_token = accesskey.split(':');
  
    return new Promise<string>((resolve, reject) => {
        const options = {
            method: "GET",
            url: "https://api.apptest.ai/openapi/v2/testset/" + String(ts_id) + "/result",
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

function make_result(json_string:string, error_only:boolean=false) {
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

function get_errors(json_string:string) {
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

        let testsetname: string | undefined = tl.getInput('testset_name', false);
        const timelimit = tl.getInput('time_limit', false);
        const usevo = tl.getInput('use_vo', false);
        const callback = tl.getInput('callback', false);
        const loginid = tl.getInput('login_id', false);
        const loginpw = tl.getInput('login_pw', false);
    
        if (!accesskey) {
            throw Error("access_key is required parameter.");
        }
      
        if (!projectid) {
            throw Error("project_id is required parameter.");
        }
      
        if (!binarypath) {
            throw Error("binary_path is required parameter.");
        }
      
        if (accesskey.indexOf(':') == -1) {
            throw Error("The format of access_key is incorrect.");
        }

        if (!fs.existsSync(binarypath)) {
            throw Error("binary_path file not exists.")
        }
      
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
            let params : any = {};
            params['testset_name'] = testsetname;
            params['time_limit'] = timelimit;
            params['use_vo'] = usevo;
            params['callback'] = callback;
            let credentials : any = {}
            credentials['login_id'] = loginid;
            credentials['login_pw'] = loginpw;
            params['credentials'] = credentials;
      
            let http_promise_execute = execute_test(accesskey, projectid, binarypath, params);
            let resp = await http_promise_execute;
    
            if (!resp) {
                throw Error("Test initiation failed: no response.");
            }
            let ret = JSON.parse(resp);
            if (!('testset_id' in ret['data'])) {
                throw Error("Test initialize failed: invalid response.");
            }
            ts_id = ret['data']['testset_id'];
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
            console.log("Test is progressing... " + String(step_count * 15) + "sec.");
            
            try {
                let http_promise_check = check_complete(accesskey, ts_id);
                let resp = await http_promise_check;
        
                if (!resp) {
                    throw Error("Test progress check failed : no response. retry!");
                }
    
                let ret = JSON.parse(resp);
                if (ret['data']['testset_status'] == 'Complete') {
                    console.log("Test finished.");
            
                    let http_promise_check = get_test_result(accesskey, ts_id);
                    let resp = await http_promise_check;
          
                    if (!resp) {
                        throw Error("Get test result failed : no response. retry!");
                    }
        
                    let ret = JSON.parse(resp);    
                    var errors = get_errors(ret['data']['result_json']);
                    if (errors) {
                        var output_table = make_result(ret['data']['result_json']);
                        console.log(output_table);
            
                        if (errors.length > 0) {
                            c.enabled = false;
                            var output_error = make_result(ret['data']['result_json'], true);
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
module.exports = {get_errors, make_result, execute_test, check_complete, get_test_result, clear_commit_message};
if (require.main === module) {
  run();
}