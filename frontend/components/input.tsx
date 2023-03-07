import {styled} from "@nextui-org/react";
import UploadIcon from "./icons/upload-icon";

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
  padding: '30px',
  background: '$red100',
  border: '2px dashed $hippo1light',
  textAlign: 'center',
  transition: 'background 0.3s ease-in-out',
  borderRadius: '0.5rem',
  color: "$gray800",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: "$4",
})
const FileInput = ({...props}) => {
  return (
    <Area data-testid='file-upload'>
      <Input type="file" {...props} />
      <Outer  className='file-helper'>
        {props.children ? props.children : <><UploadIcon/>Click to upload or drag your paper here</>}
      </Outer>
    </Area>
  )
}

export default FileInput