import { styled } from "@nextui-org/react";
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload } from 'antd';
import { Flex } from "./styles/flex";

const { Dragger } = Upload;


const FileInput = ({ ...props }) => {
  return (
    <Dragger {...props} style={{ padding: "1rem 2rem" }}>
      <p className="ant-upload-drag-icon">
        <UploadOutlined />
      </p>
      <p className="ant-upload-text">Click or drag file to this area to upload</p>
    </Dragger>
  )
}

export default FileInput