export function verifyIfInDynamo(tableName: string, indexField: string, indexValue: string, extraAttributes: { [key: string]: string | boolean | number }) {
    const query = `--index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributesToJq(extraAttributes)})' | grep '"${indexField}":' || (echo "No item found with requested charactersitics" && exit 1)`
    if (process.env.ENVIRONMENT === 'dev') {
      const command = `aws --endpoint-url=http://localhost:4566 dynamodb query --table-name ${tableName} ${query}`
      console.log(command);
      require('child_process').execSync(command);
    } else {
      require('child_process').execSync(`aws dynamodb query --table-name ${tableName} ${query}`);
    }
  }
  
  export function safeDeleteFromDynamo(tableName: string, keyField: string, keyValue) {
    let command = `dynamodb delete-item --table-name ${tableName} --key '{ "${keyField}": {"S": "${keyValue}"} }' || exit 0`
    if (process.env.ENVIRONMENT === 'dev') {
      command = `aws --endpoint-url=http://localhost:4566 ` + command
    } else {
      command = `aws ` + command
    }
    require('child_process').execSync(command);
  }
  
  export function putInDynamo(tableName: string, keyField: string, keyValue: string, extraAttributes: { [key: string]: string | boolean | number }) {
    let command = `dynamodb put-item --table-name ${tableName} --item '{ "${keyField}": {"S": "${keyValue}"}, ${formatAttributesToAws(extraAttributes)} }' || exit 0`
    if (process.env.ENVIRONMENT === 'dev') {
      command = `aws --endpoint-url=http://localhost:4566 ` + command
    } else {
      command = `aws ` + command
    }
    require('child_process').execSync(command);
  }

  function formatAttributesToAws(obj: { [key: string]: string | boolean | number }): string {
    return Object.entries(obj).map(([key, value]) => {
      let formattedValue: string;
      formattedValue = `"${value}"`;
      if (typeof value === 'string') {
        return `"${key}": {"S": ${formattedValue}}`;
      } else if (typeof value === 'number') {
        return `"${key}": {"N": ${formattedValue}}`;
      } else if (typeof value === 'boolean') {
        return `"${key}": {"BOOL": ${value}}`;
      }
      throw new Error(`Unsupported type ${typeof value} for value ${value}`);
    }).join(', ');
  }

  function formatAttributesToJq(obj: { [key: string]: string | boolean | number }): string {
    return Object.entries(obj).map(([key, value]) => {
      let formattedValue: string;
      formattedValue = `"${value}"`;
      if (typeof value === 'string') {
        return `.${key}.S == ${formattedValue}`;
      } else if (typeof value === 'number') {
        return `.${key}.N == ${formattedValue}`;
      } else if (typeof value === 'boolean') {
        return `.${key}.BOOL == ${value}`;
      }
      throw new Error(`Unsupported type ${typeof value} for value ${value}`);
    }).join(' and ');
  }