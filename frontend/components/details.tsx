import {PaperData} from "../pages";
import {Flex} from "./styles/flex";
import {Button, Link, styled} from "@nextui-org/react";

const List = styled('ul', {

})
export const Details = ({data}: { data: PaperData }) => {
  return <Flex direction="column" css={{
    textAlign: "left"
  }}>
    <h3>{data.title}</h3>
    {data.datasets.map(dataset => (
      <Flex>
        <ul>
          <li><strong>Name:</strong> {dataset.name}</li>
          <li><strong>Size:</strong> {dataset.size}</li>
          <li><strong>Download Types:</strong> {dataset.download_types.join(", ")}</li>
        </ul>
        <Link href={dataset.source} >Explore dataset</Link>
      </Flex>
    ))}
  </Flex>
}