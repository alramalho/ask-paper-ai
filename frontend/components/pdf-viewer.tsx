import React, {useState} from "react";
import {Document, Page, pdfjs} from "react-pdf";
// import pdf worker as a url, see `next.config.js` and `pdf-worker.js`
import workerSrc from "../pdf-worker";
import {Box} from "./layout";
import {Button, CSS, Text} from "@nextui-org/react";
import {Flex} from "./styles/flex";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  pdf: File,
  css?: CSS

}

const PdfViewer = ({pdf, css}: PdfViewerProps) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({numPages}) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <Box css={css}>
      <Box css={{boxShadow: 'rgba(100, 100, 111, 0.2) 0px 7px 29px 0px'}}>
        <Document
          file={pdf}
          onLoadSuccess={onDocumentLoadSuccess}
        >
          <Page
            pageNumber={pageNumber}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </Box>
      <Box>
        <Text>
          Page {pageNumber || (numPages ? 1 : '--')} of {numPages || '--'}
        </Text>
        <Flex css={{gap: "$2"}}>
          <Button
            auto
            size={'sm'}
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
          >
            Previous
          </Button>
          <Button
            auto
            size={'sm'}
            type="button"
            disabled={pageNumber >= (numPages ?? 0)}
            onClick={nextPage}
          >
            Next
          </Button>
        </Flex>
      </Box>
    </Box>
  )
};

export default PdfViewer;
