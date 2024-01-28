import { Modal } from 'antd';
import React, { useState } from 'react';

const DeprecationModal: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Modal title="🟧 IMPORTANT Message from AskPaper 🟧" open={isModalOpen} onOk={() => open("https://ko-fi.com/alexramalho")} onCancel={handleCancel} okText="Donate">
        <p>Hi, my name is Alex, and I am the developer and maintainer of AskPaper.</p>
        <p>This initiative was part of my founding role in the Hippo AI Foundation, which unfortunately was terminated due to diverging values.<br/>
        I've developed it at my own cost, but the running costs were covered by the foundation. <br/>
        As so, I no longer have the time or the money to maintain this project running.</p>
        <p>I have made all the code <a href="https://github.com/alramalho/ask-paper">open source</a> and I invite you all to either help maintain it or <a href="https://ko-fi.com/alexramalho">donate</a> so that I can do it myself.</p>
        <p>I'm keeping the UI as is, even though it is not working, to have the minimal changes necessary in the possible case of a revamp / fix. </p>

        <p>Thank you to all that used the product. If you have enjoyed it while it lasted, I invite you to follow me on <a href="https://twitter.com/alexramalho">X</a>, as I intend on bringing another projects that go in the same direction as AskPaper.<br/>Best, Alex<br/></p>
        
      </Modal>
    </>
  );
};

export default DeprecationModal;