import { Tree } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Paper } from '../pages';


class TreeNode {
    title: string;
    key: string;
    children?: TreeNode[];

    constructor(title: string, key: string, children?: TreeNode[]) {
        this.title = title;
        this.key = key;
        this.children = children;
    }

    addChild(other: TreeNode): void {
        if (this.children === undefined) {
            this.children = [];
            this.children.push(other);
            return
        }

        for (let child of this.children) {
            if (other.shouldBeChildOf(child)) {
                child.addChild(other);
                return;
            }
            if (other.shouldBeChildOf(this) && !this.children.find(child => child.equals(other))) {
                this.children.push(other);
                return;
            }
        }
    }


    shouldBeChildOf(other: TreeNode) {
        const childParts = this.key.split('.').filter(part => part !== '');
        const parentParts = other.key.split('.').filter(part => part !== '');

        if (childParts.length <= parentParts.length) {
            return false;
        }

        for (let i = 0; i < parentParts.length; i++) {
            if (childParts[i] !== parentParts[i]) {
                return false;
            }
        }

        return true;
    }

    equals(other: TreeNode): boolean {
        return this.key == other.key;
    }
}


interface PaperSectionSelectorProps {
    uploadedPaper: Paper;
    setFilteredPaper: (a: Paper) => void;
}

const SectionSelector = ({ uploadedPaper, setFilteredPaper }: PaperSectionSelectorProps) => {
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
    const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);

    const treeData = useMemo(() => {
        if (!uploadedPaper) {
            return [];
        }

        const textBlocks = [...uploadedPaper.pdf_parse.body_text, ...uploadedPaper.pdf_parse.back_matter];
        let tree = textBlocks
            .map(block => new TreeNode(block.section, block.sec_num || block.section))
            .sort((a, b) => {
                if (isDigit(a.key[0]) && isDigit(b.key[0])) {
                    return a.key > b.key ? 1 : -1
                } else if (isDigit(a.key[0])) {
                    return -1
                } else if (isDigit(b.key[0])) {
                    return 1
                } else {
                    return 0
                }
            });

        const result: TreeNode[] = [];

        for (let i = 0; i < tree.length; i++) {
            const node = tree[i];

            if (i == 0) {
                result.push(node);
                continue;
            }

            const previousNode = result[result.length - 1]
            if (node.shouldBeChildOf(previousNode)) {
                previousNode.addChild(node)
            } else {
                if (!(result.find(e => node.equals(e)))) {
                    result.push(node)
                }
            }
        }

        return result;

    }, [uploadedPaper])

    useEffect(() => {
        if (!treeData) {
            return;
        }
        setCheckedKeys(treeData.map(node => node.key))
    }, [treeData])


    const onExpand = (expandedKeysValue: React.Key[]) => {
        // if not set autoExpandParent to false, if children expanded, parent can not collapse.
        // or, you can remove all expanded children keys.
        setExpandedKeys(expandedKeysValue);
        setAutoExpandParent(false);
    };

    const onCheck = (checkedKeysValue: React.Key[]) => {
        setCheckedKeys(checkedKeysValue);
    };

    useEffect(() => {
        function filterPaperSections(paper: Paper, sectionIds: string[]): Paper {
            // Clone the paper object to avoid mutating the original
            let filteredPaper: Paper = JSON.parse(JSON.stringify(paper));

            // Filter body_text
            filteredPaper.pdf_parse.body_text = filteredPaper.pdf_parse.body_text.filter(section =>
                sectionIds.includes(section.section) || (section.sec_num !== null && sectionIds.includes(section.sec_num))
            );

            // Filter back_matter
            filteredPaper.pdf_parse.back_matter = filteredPaper.pdf_parse.back_matter.filter(section =>
                sectionIds.includes(section.section) || (section.sec_num !== null && sectionIds.includes(section.sec_num))
            );

            return filteredPaper;
        }
        if (!uploadedPaper) {
            return;
        }
        setFilteredPaper(filterPaperSections(uploadedPaper, checkedKeys as string[]))
    }, [checkedKeys])

    return <div data-testid="paper-section-selector">
        <Tree
            checkable
            selectable={false}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            // @ts-ignore
            onCheck={onCheck}
            checkedKeys={checkedKeys}
            treeData={treeData}
        />
    </div>
}

function isDigit(char) {
    return /^\d$/.test(char);
}

export default SectionSelector