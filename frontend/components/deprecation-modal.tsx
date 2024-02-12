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
        <p>I have made all the code <a href="https://github.com/alramalho/ask-paper-ai">open source</a> and I invite you all to either help maintain it or <a href="https://ko-fi.com/alexramalho">donate</a> so that I can do it myself.</p>
        <p>In the donate link you will find a 1000€ target pool, which is roughly the necessary amount to pay any outstanding fees, and put in the work to convert it to a BYOK model.</p>

        <p>Thank you to all that used the product. Feel free to reach out to me on <a href="https://twitter.com/alexramalho">X</a>, with ideas or suggestions.<br/>Best, Alex<br/></p>
        
      </Modal>
    </>
  );
};

export default DeprecationModal;