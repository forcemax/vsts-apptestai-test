# apptest.ai test action

vsts extension for apptest.ai test execution

## Installation

Installation can be done using [Visual Studio MarketPlace](https://marketplace.visualstudio.com/items?itemName=apptestai.apptestai-test).

## Source Code

Source code can be found on [Github](https://github.com/forcemax/vsts-apptestai-test).

## Usage

Add the tasks to your build definition.

### Inputs

Input your apptest.ai Access Key, Project ID, Package file <br />
refer to more information from https://app.apptest.ai/#/main/integrations

**Required** apptest.ai Access Key, Project ID, Package file.

Setup Access Key using azure pipeline secret variable : APPTEST_AI_ACCESS_KEY

### Example usage
This is the example to using azure pipeline<br />
Please change to the your input.

```yaml
    - task: apptestai-test@0
      inputs:
        access_key: '$(APPTEST_AI_ACCESS_KEY)'
        project_id: '12847'
        binary_path: 'build/app/outputs/apk/release/app-release.apk'
```

Running example is available on <br />
https://github.com/forcemax/trace/blob/master/azure-pipelines.yml <br />
