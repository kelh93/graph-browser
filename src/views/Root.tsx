import { SigmaContainer, ZoomControl } from "@react-sigma/core";
// import { createNodeImageProgram } from "@sigma/node-image";
import EdgeCurveProgram  from '@sigma/edge-curve'
import { DirectedGraph } from "graphology";
import { constant, keyBy, mapValues, omit } from "lodash";
import { FC, useEffect, useMemo, useState } from "react";
import { BiBookContent } from "react-icons/bi";
import { BsArrowsFullscreen, BsZoomIn, BsZoomOut, BsChevronLeft } from "react-icons/bs";
import { GrClose } from "react-icons/gr";
import { Settings } from "sigma/settings";

import { drawHover, drawLabel } from "../canvas-utils";
import { Dataset, FiltersState } from "../types";
// import ClustersPanel from "./ClustersPanel";
// import DescriptionPanel from "./DescriptionPanel";
import GraphDataController from "./GraphDataController";
import GraphEventsController from "./GraphEventsController";
import GraphSettingsController from "./GraphSettingsController";
// import GraphTitle from "./GraphTitle";
// import SearchField from "./SearchField";
// import TagsPanel from "./TagsPanel";
import SideBar from "../components/SideBar"
import { isUser, randomNum, randomUuid, randomEvents } from '../utils'

const ProjectColor = 'rgba(194, 160, 190, 0.7)'


const Root: FC = () => {
  const graph = useMemo(() => new DirectedGraph(), []);
  // const sigmaRef = useRef(null)
  const [showContents, setShowContents] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isFold, setIsFold] = useState<boolean | null>(null);
  const [filtersState, setFiltersState] = useState<FiltersState>({
    clusters: {},
    tags: {},
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const sigmaSettings: Partial<Settings> = useMemo(
    () => ({
      // nodeProgramClasses: {
      //   image: createNodeImageProgram({
      //     size: { mode: "force", value: 256 },
      //   }),
      // },
      edgeProgramClasses: { curve: EdgeCurveProgram, },
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: drawHover,
      defaultNodeType: "circle", // image 
      defaultEdgeType: "curve", // arrow、curve
      labelDensity: 0.07,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 15,
      labelFont: "Lato, sans-serif",
      zIndex: true,
    }),
    [],
  );

  // Load data on mount:
  useEffect(() => {
    try {
      fetch(`./dataset.json`)
      .then((res) => res.json())
      .then((dataset: Dataset) => {
        const clusters = keyBy(dataset.clusters, "key");
        const tags = keyBy(dataset.tags, "key");

        const newNodes = dataset.nodes.map((node) => {
          if(isUser(node.tag)) {
            const rP = randomNum();
            return {
              ...node,
              points: rP > 1000 ? Math.round(rP/1000) + 'K' : rP,
              id: randomUuid(),
              eventNumber: randomEvents(),
            }
          } else {
            return {
              ...node,
              points: '',
              id: '',
              eventNumber: 0,
            }
          }
        });

        newNodes.forEach((node) => {
          try {
            graph.addNode(node.key, {
              ...node,
              // label: node.id,
              ...omit(clusters[node.cluster], "key"),
              image: `./images/${tags[node.tag].image}`,
            })
          } catch (error) {
            // console.log('dataset.nodes', error)
          }

        });
        dataset.edges.forEach(([source, target]) => {
          graph.addEdge(source, target, { size: 1, color: 'rgba(123, 155, 212, 0.7)' })
          // graph.addEdge(source, target, { size: 1, color: '#b2bbd778' });
          // graph.setEdgeAttribute(source, target, "color", '#403F4F');
        });

        // Use degrees as node sizes:
        // const scores = graph.nodes().map((node) => graph.getNodeAttribute(node, "score"));
        // const minDegree = Math.min(...scores);
        // const maxDegree = Math.max(...scores);
        // const MIN_NODE_SIZE = 3;
        // const MAX_NODE_SIZE = 30;

        /***
         *  ((graph.getNodeAttribute(node, "score") - minDegree) / (maxDegree - minDegree)) *
              (MAX_NODE_SIZE - MIN_NODE_SIZE) +
              MIN_NODE_SIZE
         */
        graph.forEachNode((node, attrs) => {
          graph.setNodeAttribute(node,"size",10);
          graph.setNodeAttribute(node,"color",'rgba(73, 94, 152, 0.7)');
          const isProject = ['Organization', 'Person', 'Technology', 'Tool', 'Event','Concept']
          if(isProject.includes(attrs.tag)){
            graph.setNodeAttribute(node,"color",ProjectColor);
          }
          // graph.setNodeAttribute(node, 'color', '#606bb1')

          // graph.setNodeAttribute(node,"color",'#b2c6fe');

        });

        setFiltersState({
          clusters: mapValues(keyBy(dataset.clusters, "key"), constant(true)),
          tags: mapValues(keyBy(dataset.tags, "key"), constant(true)),
        });

        setDataset(dataset);
        requestAnimationFrame(() => setDataReady(true));
      });
    } catch (error) {
      console.log('fetching data', error)
    }
  }, []);

  const toggleSideBar = () => {
    console.log('toggleSideBar', isFold)
    if(isFold === null) {
      setIsFold(true)
    } else {
      setIsFold(!isFold)
    }
  }

  if (!dataset) return null;

  return (
    <div id="app-root" className={showContents ? "show-contents" : ""}>
      <SigmaContainer graph={graph} settings={sigmaSettings} className={ isFold ? 'fold-sider-bar' : '' }>
        <GraphSettingsController hoveredNode={hoveredNode} />
        <GraphEventsController setHoveredNode={setHoveredNode} />
        <GraphDataController filters={filtersState} />

        {dataReady && (
          <>
            <div className="controls">
              <div className="react-sigma-control ico">
                <button
                  type="button"
                  className="show-contents"
                  onClick={() => setShowContents(true)}
                  title="Show caption and description"
                >
                  <BiBookContent />
                </button>
              </div>
              <div className="ico fold-btn">
                <button onClick={() => toggleSideBar()}>
                  <BsChevronLeft className="icon-fold" />
                </button>
              </div>
              {/* <FullScreenControl className="ico"> */}
                {/* <BsArrowsFullscreen />
                <BsFullscreenExit /> */}
              {/* </FullScreenControl> */}

              <ZoomControl className="ico">
                <BsZoomIn />
                <BsZoomOut />
                <BsArrowsFullscreen />
              </ZoomControl>
            </div>
            <div className="contents">
              <div className="ico">
                <button
                  type="button"
                  className="ico hide-contents"
                  onClick={() => setShowContents(false)}
                  title="Show caption and description"
                >
                  <GrClose />
                </button>
              </div>
              {/* <GraphTitle filters={filtersState} /> */}

              <SideBar isFold={isFold}  node={hoveredNode} />

              {/* <div className="panels"> */}

                {/* <PanelHeader /> */}
                {/* <SearchField filters={filtersState} /> */}
                {/* <DescriptionPanel /> */}
                {/* <ClustersPanel
                  clusters={dataset.clusters}
                  filters={filtersState}
                  setClusters={(clusters) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters,
                    }))
                  }
                  toggleCluster={(cluster) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters: filters.clusters[cluster]
                        ? omit(filters.clusters, cluster)
                        : { ...filters.clusters, [cluster]: true },
                    }));
                  }}
                /> */}
                {/* <TagsPanel
                  tags={dataset.tags}
                  filters={filtersState}
                  setTags={(tags) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      tags,
                    }))
                  }
                  toggleTag={(tag) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      tags: filters.tags[tag] ? omit(filters.tags, tag) : { ...filters.tags, [tag]: true },
                    }));
                  }}
                /> */}
              {/* </div> */}
            </div>
          </>
        )}
      </SigmaContainer>
    </div>
  );
};

export default Root;
