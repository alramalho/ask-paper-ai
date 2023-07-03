export function verifyIfInDynamo(tableName: string, indexField: string, indexValue: string, extraAttributes: { [key: string]: string | boolean | number }) {
    const query = `--index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributes(extraAttributes)})' | grep '"${indexField}":' || (echo "No item found with requested charactersitics" && exit 1)`
    if (process.env.ENVIRONMENT === 'dev') {
      const command = `aws --endpoint-url=http://localhost:4566 dynamodb query --table-name ${tableName} ${query}`
      console.log(command);
      require('child_process').execSync(command);
    } else {
      require('child_process').execSync(`aws dynamodb query --table-name ${tableName} ${query}`);
    }
  }
  
  export function deleteFromDynamo(tableName: string, keyField: string, keyValue) {
    const command = `aws dynamodb delete-item --table-name ${tableName} --key '{ "${keyField}": {"S": "${keyValue}"} }' || exit 1`
    require('child_process').execSync(command);
  }
  
  function formatAttributes(obj: { [key: string]: string | boolean }): string {
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