import { styled } from "@nextui-org/react";
import UploadIcon from "./icons/upload-icon";
import { Div } from "./layout";
import { FileOutlined } from "@ant-design/icons";

const Area = styled('div', {
  position: 'relative',
  width: '400px',
})

const Input = styled('input', {
  position: 'absolute',
  width: '100%',
  height: '100%',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  opacity: '0',
  cursor: 'pointer',

})

const Outer = styled('div', {
  width: '100%',
  height: '100%',
  padding: '30px',
  background: 'rgba(255,0,0,0.05)',
  border: '2px dashed $hippo1light',
  textAlign: 'center',
  transition: 'background 0.3s ease-in-out',
  borderRadius: '0.5rem',
  color: "$gray800",
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: "$4",
})
const FileInput = ({ ...props }) => {
  return (
    <Area data-testid='file-upload'>
      <Input type="file" {...props} />
      <Outer className='file-helper'>
        <UploadIcon size="32" />
        <p>Click to upload or drag your paper here</p>
      </Outer>
    </Area>
  )
}

const MinimalArea = styled('div', {
  position: 'relative',
  width: '500px',
  maxWidth: "100%",
})

const MinimalInput = styled('input', {
  position: 'absolute',
  width: '100%',
  height: '100%',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  opacity: '0',
  cursor: 'pointer',

})

const MinimalOuter = styled('div', {
  width: 'fit-content',
  margin: '0 auto',
  height: '100%',
  border: '1px solid $hippo1light',
  background: 'rgba(255,0,0,0.05)',
  textAlign: 'center',
  transition: 'background 0.3s ease-in-out',
  borderRadius: '0.5rem',
  color: "$gray800",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: "$4",
  padding: '0.5rem', 
  flexDirection: 'row'
})

export const MinimalFileInput = ({ ...props }) => {
  return  (
    <MinimalArea data-testid='file-upload'>
      <MinimalInput type="file" {...props} />
      <MinimalOuter className='file-helper'>
        <UploadIcon size="16" />
        <span>Upload via file</span>
      </MinimalOuter>
    </MinimalArea>
  )
}

export default FileInput