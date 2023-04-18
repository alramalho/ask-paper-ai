import React, { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// import pdf worker as a url, see `next.config.js` and `pdf-worker.js`
import workerSrc from "../pdf-worker";
import { Box } from "./layout";
import { Button, CSS, Spacer, Text } from "@nextui-org/react";
import { Flex } from "./styles/flex";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  pdf: File,
}

const PdfViewer = ({ pdf }: PdfViewerProps) => {
  const [searchText, setSearchText] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
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


  function highlightPattern(text, pattern) {
    return text.replace(pattern, (value) => `<mark>${value}</mark>`);
  }

  const textRenderer = useCallback(
    (textItem) => highlightPattern(textItem.str, searchText),
    [searchText]
  );

  useEffect(() => {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
    });
  }, [pageNumber]);

  return (
    <Box data-testid="pdf">
      <div>
        <label htmlFor="search">Search:</label>
        <input type="search" id="search" value={searchText} onChange={event => setSearchText(event.target.value)} />
      </div>
      <Spacer y={1} />
      <Box>
        <Document
          file={pdf}
          onLoadSuccess={onDocumentLoadSuccess}
          options={{
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
          }}
        >

          {Array.from(
            new Array(numPages),
            (el, index) => (
              <>
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  customTextRenderer={textRenderer}
                />
                <Spacer y={1} />
              </>
            ),
          )}
        </Document>
      </Box>
    </Box>
  )
};

export default PdfViewer;
