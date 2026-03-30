import * as FRAGS from "@thatopen/fragments";
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

// --------------------
// 🌎 SCENE SETUP
// --------------------
const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById("container")!;
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

await world.camera.controls.setLookAt(50, 50, 50, 0, 0, 0);

components.init();

// --------------------
// 🛠️ FRAGMENTS SETUP
// --------------------
const githubUrl =
  "https://thatopen.github.io/engine_fragment/resources/worker.mjs";

const fetchedUrl = await fetch(githubUrl);
const workerBlob = await fetchedUrl.blob();

const workerFile = new File([workerBlob], "worker.mjs", {
  type: "text/javascript",
});

const workerUrl = URL.createObjectURL(workerFile);

const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

// Update on camera move
world.camera.controls.addEventListener("update", () => {
  fragments.core.update();
});

// Sync camera
world.onCameraChanged.add((camera) => {
  for (const [, model] of fragments.list) {
    model.useCamera(camera.three);
  }
  fragments.core.update(true);
});

// Add model to scene
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

// Walls & Slabs
finder.create("Walls & Slabs", [
  {
    categories: [/WALL/i, /SLAB/i],
  },
]);

// Pipes
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

// Valves
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

// ✅ Rebars (ROBUST VERSION)
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

// Helper
const getResult = async (name: string) => {
  const finderQuery = finder.list.get(name);
  if (!finderQuery) return {};
  return await finderQuery.test();
};

// --------------------
// 🎨 UI
// --------------------
BUI.Manager.init();

const panel = BUI.Component.create(() => {
  const hider = components.get(OBC.Hider);

  const onWalls = async () => {
    const result = await getResult("Walls & Slabs");
    await hider.isolate(result);
  };

  const onPipes = async () => {
    const result = await getResult("Pipes");
    console.log("Pipes:", result);
    await hider.isolate(result);
  };

  const onValves = async () => {
    const result = await getResult("Valves");
    console.log("Valves:", result);
    await hider.isolate(result);
  };

  const onRebars = async () => {
    const result = await getResult("Rebars");
    console.log("Rebars:", result);

    if (Object.keys(result).length === 0) {
      alert("No rebars found. Check IFC categories in console.");
      return;
    }

    await hider.isolate(result);
  };

  const onReset = async () => {
    await hider.set(true);
  };

  return BUI.html`
    <bim-panel class="options-menu" active label="Items Finder">
      <bim-panel-section label="Actions">
        <bim-button label="Show Walls & Slabs" @click=${onWalls}></bim-button>
        <bim-button label="Show Pipes" @click=${onPipes}></bim-button>
        <bim-button label="Show Valves" @click=${onValves}></bim-button>
        <bim-button label="Show Rebars" @click=${onRebars}></bim-button>
        <bim-button label="Reset" @click=${onReset}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `;
});

document.body.append(panel);

// --------------------
// ⏱️ PERFORMANCE
// --------------------
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);

world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());