import * as FRAGS from "@thatopen/fragments";
import workerUrl from "@thatopen/fragments/worker?url";
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";

// --------------------
// 🌎 SCENE SETUP
// --------------------
const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById("container")!;
world.renderer = new OBF.PostproductionRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

await world.camera.controls.setLookAt(50, 50, 50, 0, 0, 0);

components.init();

components.get(OBC.Raycasters).get(world);

const clipper = components.get(OBC.Clipper);
clipper.enabled = true;
clipper.orthogonalY = true;

// --------------------
// 📏 MEASUREMENTS SETUP
// --------------------
const lengthMeasurement = components.get(OBF.LengthMeasurement);
lengthMeasurement.world = world;
lengthMeasurement.enabled = false;
lengthMeasurement.mode = "free";
lengthMeasurement.units = "m";
lengthMeasurement.rounding = 2;
lengthMeasurement.snappings = [FRAGS.SnappingClass.POINT];
let isPickingDistanceStart = true;

const angleMeasurement = components.get(OBF.AngleMeasurement);
angleMeasurement.world = world;
angleMeasurement.enabled = false;
angleMeasurement.mode = "free";
angleMeasurement.units = "deg";
angleMeasurement.rounding = 2;
let angleClickStep = 1;
let pipeInspectEnabled = false;

// --------------------
// 🛠️ FRAGMENTS SETUP (local worker — no network fetch)
// --------------------
const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

// Camera sync
world.camera.controls.addEventListener("update", () => {
  fragments.core.update();
});

world.onCameraChanged.add((camera) => {
  for (const [, model] of fragments.list) {
    model.useCamera(camera.three);
  }
  fragments.core.update(true);
});

// Add model
fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});

// Fix z-fighting
fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
  if (!("isLodMaterial" in material && material.isLodMaterial)) {
    material.polygonOffset = true;
    material.polygonOffsetUnits = 1;
    material.polygonOffsetFactor = Math.random();
  }
});

// --------------------
// 📂 LOAD FRAGMENTS
// --------------------
const input = document.getElementById("fragInput") as HTMLInputElement;

input.addEventListener("change", async () => {
  const files = input.files;
  if (!files) return;

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const modelId = file.name.replace(".frag", "");
    await fragments.core.load(buffer, { modelId });
  }

  console.log("Fragments loaded:", fragments.list);
});

// --------------------
// 🔍 ITEMS FINDER
// --------------------
const finder = components.get(OBC.ItemsFinder);

finder.create("Walls & Slabs", [{ categories: [/WALL/i, /SLAB/i] }]);

finder.create("Pipes", [
  {
    categories: [
      /IFCPIPESEGMENT/i,
      /IFCPIPEFITTING/i,
      /IFCFLOWSEGMENT/i,
      /PIPE/i,
      /FLOW/i,
    ],
  },
]);

finder.create("Valves", [
  {
    categories: [
      /IFCVALVE/i,
      /GATEVALVE/i,
      /CHECKVALVE/i,
      /BUTTERFLYVALVE/i,
      /PLUGVALVE/i,
      /FLOWCONTROLLER/i,
      /VALVE/i,
    ],
  },
]);

finder.create("Rebars", [
  {
    categories: [
      /REINFORC/i,
      /REBAR/i,
      /BAR/i,
      /IFCREINFORCINGBAR/i,
      /IFCREINFORCINGMESH/i,
      /PROXY/i,
    ],
  },
]);

finder.create("HVAC", [
  {
    categories: [
      /IFCDUCT/i,
      /DUCT/i,
      /IFCAIRTERMINAL/i,
      /IFCCOOLING/i,
      /IFCHEATING/i,
      /IFCFAN/i,
      /IFCPUMP/i,
      /IFCBOILER/i,
      /IFCCHILLER/i,
      /IFCCONDENSER/i,
      /IFCSPACEHEATER/i,
      /IFCHUMIDIFIER/i,
      /IFCFLOWMETER/i,
      /IFCDISTRIBUTION/i,
      /IFCAIRTOAIR/i,
    ],
  },
]);

finder.create("Electrical", [
  {
    categories: [
      /CABLE/i,
      /ELECTRIC/i,
      /LAMP/i,
      /LIGHT/i,
      /SWITCH/i,
      /OUTLET/i,
      /SOCKET/i,
      /IFCJUNCTIONBOX/i,
      /TRANSFORMER/i,
      /GENERATOR/i,
      /PROTECTIVEDEVICE/i,
      /IFCMOTOR/i,
    ],
  },
]);

finder.create("Civil", [
  {
    categories: [
      /IFCWALL/i,
      /IFCSLAB/i,
      /IFCBEAM/i,
      /IFCCOLUMN/i,
      /IFCFOOTING/i,
      /IFCPILE/i,
      /IFCFOUNDATION/i,
      /IFCRAMP/i,
      /IFCSTAIR/i,
      /REINFORC/i,
      /IFCMEMBER/i,
      /IFCPLATE/i,
    ],
  },
]);

finder.create("Architecture", [
  {
    categories: [
      /IFCWINDOW/i,
      /IFCDOOR/i,
      /IFCROOF/i,
      /IFCCURTAINWALL/i,
      /IFCSPACE/i,
      /IFCRAILING/i,
      /IFCOPENING/i,
      /IFCSLAB/i,
    ],
  },
]);

finder.create("Plumbing", [
  {
    categories: [
      /IFCPIPE/i,
      /IFCFLOWSEGMENT/i,
      /IFCFLOWFITTING/i,
      /IFCTANK/i,
      /SANITARY/i,
      /IFCVALVE/i,
      /IFCSTACKTERMINAL/i,
      /IFCWASTE/i,
      /IFCPIPEFITTING/i,
    ],
  },
]);

const getResult = async (name: string) => {
  const query = finder.list.get(name);
  if (!query) return {};
  return await query.test();
};

// --------------------
// 🔢 COUNT FUNCTION
// --------------------
const countItems = (result: OBC.ModelIdMap) => {
  let count = 0;
  for (const modelId in result) {
    count += result[modelId].size;
  }
  return count;
};

// --------------------
// 👁️ GHOST FILTER (DIM OTHERS)
// --------------------
const applyGhostFilter = async (result: OBC.ModelIdMap) => {
  const dimOpacity = 0.1;

  for (const [, model] of fragments.list) {
    await model.setOpacity(undefined, dimOpacity);
  }

  for (const modelId in result) {
    const model = fragments.list.get(modelId);
    if (!model) continue;
    const localIds = [...result[modelId]];
    await model.setOpacity(localIds, 1);
  }

  fragments.core.update(true);
};

const getFragmentsBounds = async (): Promise<THREE.Box3> => {
  const box = new THREE.Box3();
  let has = false;
  for (const [, model] of fragments.list) {
    const ids = await model.getItemsIdsWithGeometry();
    if (!ids.length) continue;
    const b = await model.getMergedBox(ids);
    if (!has) {
      box.copy(b);
      has = true;
    } else {
      box.union(b);
    }
  }
  if (!has) {
    box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));
  }
  return box;
};

// --------------------
// 🎨 UI
// --------------------
BUI.Manager.init();

let countLabel: HTMLElement;
let distanceStatusLabel: HTMLElement;
let angleStatusLabel: HTMLElement;
let pipeInspectStatusLabel: HTMLElement;
let pipeInfoLabel: HTMLElement;

const findValueByKeyHints = (data: unknown, keyHints: string[]): string | null => {
  const stack: unknown[] = [data];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    const record = current as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      if (keyHints.some((hint) => lowerKey.includes(hint)) && value !== null) {
        if (typeof value === "string" || typeof value === "number") {
          return String(value);
        }
        if (typeof value === "object" && "value" in (value as Record<string, unknown>)) {
          const nested = (value as Record<string, unknown>).value;
          if (typeof nested === "string" || typeof nested === "number") {
            return String(nested);
          }
        }
      }
      stack.push(value);
    }
  }
  return null;
};

const inspectPickedPipe = async () => {
  try {
    const raycasters = components.get(OBC.Raycasters);
    const raycaster = raycasters.get(world);
    const mouse = raycaster.mouse.position;
    if (!world.renderer) {
      pipeInfoLabel.textContent = "Pipe info: renderer not ready";
      return;
    }
    const dom = world.renderer.three.domElement;
    const camera = world.camera.three;

    let picked: FRAGS.RaycastResult | null = null;
    for (const [, model] of fragments.list) {
      const result = await model.raycast({ camera, mouse, dom });
      if (!result) continue;
      if (!picked || result.distance < picked.distance) {
        picked = result;
      }
    }

    if (!picked) {
      pipeInfoLabel.textContent = "Pipe info: click on a pipe element";
      return;
    }
    const model = picked.fragments;
    const localId = picked.localId;

    const itemData = await model.getItemsData([localId], {
      attributesDefault: true,
      relationsDefault: { attributes: true, relations: true },
    });

    const item = itemData[0];
    const asText = JSON.stringify(item).toLowerCase();
    const isPipe =
      asText.includes("ifcpipe") ||
      asText.includes("pipe") ||
      asText.includes("flowsegment") ||
      asText.includes("pipefitting");

    if (!isPipe) {
      pipeInfoLabel.textContent = "Pipe info: selected element is not detected as pipe";
      return;
    }

    const diameter =
      findValueByKeyHints(item, ["diameter", "nominaldiameter", "dn", "outerdiameter"]) ??
      "N/A";
    const material =
      findValueByKeyHints(item, ["material", "materialname", "mat"]) ?? "N/A";
    const type =
      findValueByKeyHints(item, ["predefinedtype", "objecttype", "type", "name"]) ?? "N/A";

    pipeInfoLabel.textContent = `Pipe info: Diameter=${diameter} | Material=${material} | Type=${type}`;
  } catch {
    pipeInfoLabel.textContent = "Pipe info: unable to read selected element data";
  }
};

const panel = BUI.Component.create(() => {
  const updateUI = (count: number, label: string) => {
    countLabel.textContent = `${label}: ${count}`;
  };
  const updateDistanceStatus = () => {
    if (!lengthMeasurement.enabled) {
      distanceStatusLabel.textContent = `Distance tool: OFF (${lengthMeasurement.mode})`;
      return;
    }
    distanceStatusLabel.textContent = `Distance tool: ON (${lengthMeasurement.mode}) - Click ${
      isPickingDistanceStart ? "start point" : "end point"
    }`;
  };
  const updateAngleStatus = () => {
    if (!angleMeasurement.enabled) {
      angleStatusLabel.textContent = `Angle tool: OFF (${angleMeasurement.mode})`;
      return;
    }
    const stepLabel =
      angleClickStep === 1
        ? "start point"
        : angleClickStep === 2
        ? "vertex point"
        : "end point";
    angleStatusLabel.textContent = `Angle tool: ON (${angleMeasurement.mode}) - Click ${stepLabel}`;
  };
  const updatePipeInspectStatus = () => {
    pipeInspectStatusLabel.textContent = `Pipe inspect: ${pipeInspectEnabled ? "ON" : "OFF"}`;
  };

  const handle = async (name: string) => {
    const result = await getResult(name);
    const count = countItems(result);

    console.log(name, "count:", count);

    updateUI(count, name);

    await applyGhostFilter(result);
  };

  const onReset = async () => {
    for (const [, model] of fragments.list) {
      await model.resetOpacity(undefined);
    }
    updateUI(0, "Count");
    fragments.core.update(true);
  };

  const onSectionHorizontal = async () => {
    const box = await getFragmentsBounds();
    const center = new THREE.Vector3();
    box.getCenter(center);
    clipper.createFromNormalAndCoplanarPoint(
      world,
      new THREE.Vector3(0, 1, 0),
      center,
    );
    fragments.core.update(true);
  };

  const onSectionVerticalX = async () => {
    const box = await getFragmentsBounds();
    const center = new THREE.Vector3();
    box.getCenter(center);
    clipper.createFromNormalAndCoplanarPoint(
      world,
      new THREE.Vector3(1, 0, 0),
      center,
    );
    fragments.core.update(true);
  };

  const onSectionVerticalZ = async () => {
    const box = await getFragmentsBounds();
    const center = new THREE.Vector3();
    box.getCenter(center);
    clipper.createFromNormalAndCoplanarPoint(
      world,
      new THREE.Vector3(0, 0, 1),
      center,
    );
    fragments.core.update(true);
  };

  const onClearSections = () => {
    clipper.deleteAll();
    fragments.core.update(true);
  };

  const onToggleDistanceTool = () => {
    pipeInspectEnabled = false;
    updatePipeInspectStatus();

    angleMeasurement.enabled = false;
    angleMeasurement.cancelCreation();
    angleClickStep = 1;
    updateAngleStatus();

    lengthMeasurement.enabled = !lengthMeasurement.enabled;
    lengthMeasurement.cancelCreation();
    isPickingDistanceStart = true;
    updateDistanceStatus();
  };

  const onDistanceModeToggle = () => {
    lengthMeasurement.mode = lengthMeasurement.mode === "free" ? "edge" : "free";
    lengthMeasurement.snappings =
      lengthMeasurement.mode === "edge"
        ? [FRAGS.SnappingClass.LINE]
        : [FRAGS.SnappingClass.POINT];
    lengthMeasurement.cancelCreation();
    isPickingDistanceStart = true;
    updateDistanceStatus();
  };

  const onClearMeasurements = () => {
    lengthMeasurement.cancelCreation();
    lengthMeasurement.list.clear();
    lengthMeasurement.lines.clear();
    lengthMeasurement.labels.clear();
    isPickingDistanceStart = true;
    updateDistanceStatus();
  };

  const onToggleAngleTool = () => {
    pipeInspectEnabled = false;
    updatePipeInspectStatus();

    lengthMeasurement.enabled = false;
    lengthMeasurement.cancelCreation();
    isPickingDistanceStart = true;
    updateDistanceStatus();

    angleMeasurement.enabled = !angleMeasurement.enabled;
    angleMeasurement.cancelCreation();
    angleClickStep = 1;
    updateAngleStatus();
  };

  const onClearAngles = () => {
    angleMeasurement.cancelCreation();
    angleMeasurement.list.clear();
    angleMeasurement.lines.clear();
    angleMeasurement.labels.clear();
    angleClickStep = 1;
    updateAngleStatus();
  };

  const onTogglePipeInspect = () => {
    lengthMeasurement.enabled = false;
    lengthMeasurement.cancelCreation();
    isPickingDistanceStart = true;
    updateDistanceStatus();

    angleMeasurement.enabled = false;
    angleMeasurement.cancelCreation();
    angleClickStep = 1;
    updateAngleStatus();

    pipeInspectEnabled = !pipeInspectEnabled;
    updatePipeInspectStatus();
    if (!pipeInspectEnabled) {
      pipeInfoLabel.textContent = "Pipe info: -";
    }
  };

  return BUI.html`
    <bim-panel class="options-menu" active label="Items Finder">
      <bim-panel-section label="Actions">
        <bim-button label="Walls & Slabs" @click=${() => handle("Walls & Slabs")}></bim-button>
        <bim-button label="Pipes" @click=${() => handle("Pipes")}></bim-button>
        <bim-button label="Valves" @click=${() => handle("Valves")}></bim-button>
        <bim-button label="Rebars" @click=${() => handle("Rebars")}></bim-button>
        <bim-button label="Reset" @click=${onReset}></bim-button>

        <bim-label id="countDisplay">Count: 0</bim-label>
      </bim-panel-section>

      <bim-panel-section label="Disciplines">
        <bim-label>Highlight by IFC family (ghost others)</bim-label>
        <bim-button label="HVAC" @click=${() => handle("HVAC")}></bim-button>
        <bim-button label="Electrical" @click=${() => handle("Electrical")}></bim-button>
        <bim-button label="Civil" @click=${() => handle("Civil")}></bim-button>
        <bim-button label="Architecture" @click=${() => handle("Architecture")}></bim-button>
        <bim-button label="Plumbing" @click=${() => handle("Plumbing")}></bim-button>
      </bim-panel-section>

      <bim-panel-section label="Sections">
        <bim-label>Plane at model center — add more with double-click on model</bim-label>
        <bim-button label="Horizontal (floor plan)" @click=${onSectionHorizontal}></bim-button>
        <bim-button label="Vertical along X" @click=${onSectionVerticalX}></bim-button>
        <bim-button label="Vertical along Z" @click=${onSectionVerticalZ}></bim-button>
        <bim-button label="Clear all sections" @click=${onClearSections}></bim-button>
      </bim-panel-section>

      <bim-panel-section label="Measure">
        <bim-button
          label="Toggle Distance Tool"
          @click=${onToggleDistanceTool}
        ></bim-button>
        <bim-button
          label="Switch Mode (Free / Edge)"
          @click=${onDistanceModeToggle}
        ></bim-button>
        <bim-button
          label="Clear Measurements"
          @click=${onClearMeasurements}
        ></bim-button>
        <bim-label id="distanceStatus">Distance tool: OFF (free)</bim-label>

        <bim-button
          label="Toggle Angle Tool"
          @click=${onToggleAngleTool}
        ></bim-button>
        <bim-button
          label="Clear Angles"
          @click=${onClearAngles}
        ></bim-button>
        <bim-label id="angleStatus">Angle tool: OFF (free)</bim-label>

        <bim-button
          label="Toggle Pipe Inspect"
          @click=${onTogglePipeInspect}
        ></bim-button>
        <bim-label id="pipeInspectStatus">Pipe inspect: OFF</bim-label>
        <bim-label id="pipeInfo">Pipe info: -</bim-label>
      </bim-panel-section>
    </bim-panel>
  `;
});

document.body.append(panel);

countLabel = document.getElementById("countDisplay")!;
distanceStatusLabel = document.getElementById("distanceStatus")!;
angleStatusLabel = document.getElementById("angleStatus")!;
pipeInspectStatusLabel = document.getElementById("pipeInspectStatus")!;
pipeInfoLabel = document.getElementById("pipeInfo")!;

container.addEventListener("click", async () => {
  if (!world || !world.camera || !world.renderer) return;

  if (lengthMeasurement.enabled) {
    try {
      await lengthMeasurement.create();
      isPickingDistanceStart = !isPickingDistanceStart;
      distanceStatusLabel.textContent = `Distance tool: ON (${lengthMeasurement.mode}) - Click ${
        isPickingDistanceStart ? "start point" : "end point"
      }`;
    } catch {
      distanceStatusLabel.textContent = `Distance tool: ON (${lengthMeasurement.mode}) - Click a model surface`;
    }
    return;
  }

  if (angleMeasurement.enabled) {
    try {
      await angleMeasurement.create();
      angleClickStep = angleClickStep === 3 ? 1 : angleClickStep + 1;
      const stepLabel =
        angleClickStep === 1
          ? "start point"
          : angleClickStep === 2
          ? "vertex point"
          : "end point";
      angleStatusLabel.textContent = `Angle tool: ON (${angleMeasurement.mode}) - Click ${stepLabel}`;
    } catch {
      angleStatusLabel.textContent = `Angle tool: ON (${angleMeasurement.mode}) - Click a model surface`;
    }
    return;
  }

  if (pipeInspectEnabled) {
    await inspectPickedPipe();
  }
});

container.addEventListener("dblclick", async () => {
  if (!clipper.enabled) return;
  if (lengthMeasurement.enabled || angleMeasurement.enabled || pipeInspectEnabled) return;
  await clipper.create(world);
  fragments.core.update(true);
});

window.addEventListener("keydown", async (event) => {
  if (event.code !== "Delete" && event.code !== "Backspace") return;
  if (!clipper.enabled) return;
  if (lengthMeasurement.enabled || angleMeasurement.enabled || pipeInspectEnabled) return;
  await clipper.delete(world);
  fragments.core.update(true);
});

// --------------------
// ⏱️ PERFORMANCE
// --------------------
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);

world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());