// Name: TurboModz
// ID: hamturbomodz
// Description: Implement Mods into Your Projects. Inspired by Asset Manager and Other Extensions.
// By: Hammouda101010 <https://github.com/hammouda101010>
// License: MIT

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("TurboModz must run unsandboxed");
  }

  // Scratch Vm & APIs
  const vm = Scratch.vm;
  const renderer = Scratch.renderer;
  const vmRenderer = vm.renderer;
  const runtime = vm.runtime;
  const Cast = Scratch.Cast;

  // Proxies
  const cors_proxy = "https://corsproxy.io/?"

  // Credits to Runtime Values
  const TURBO_MODE = "turbo mode";
  const INTERPOLATION = "interpolation";
  const REMOVE_FENCING = "remove fencing";
  const REMOVE_MISC_LIMITS = "remove misc limits";
  const HIGH_QUALITY_PEN = "high quality pen";
  const FRAMERATE = "framerate";
  const CLONE_LIMIT = "clone limit";
  const STAGE_SIZE = "stage size";

  /** @param {string} what */
  const emitChanged = (what) =>
    runtime.startHats("runtimeoptions_whenChange", {
      WHAT: what,
    });

  /**
   * @template T
   * @param {T} obj
   * @returns {T}
   */
  const shallowCopy = (obj) => Object.assign({}, obj);

  let previousRuntimeOptions = shallowCopy(runtime.runtimeOptions);

  vm.on("TURBO_MODE_OFF", () => emitChanged(TURBO_MODE));
  vm.on("TURBO_MODE_ON", () => emitChanged(TURBO_MODE));
  vm.on("INTERPOLATION_CHANGED", () => emitChanged(INTERPOLATION));
  vm.on("RUNTIME_OPTIONS_CHANGED", (newOptions) => {
    if (newOptions.fencing !== previousRuntimeOptions.fencing) {
      emitChanged(REMOVE_FENCING);
    }
    if (newOptions.miscLimits !== previousRuntimeOptions.miscLimits) {
      emitChanged(REMOVE_MISC_LIMITS);
    }
    if (newOptions.maxClones !== previousRuntimeOptions.maxClones) {
      emitChanged(CLONE_LIMIT);
    }
    previousRuntimeOptions = shallowCopy(newOptions);
  });
  vmRenderer.on("UseHighQualityRenderChanged", () =>
    emitChanged(HIGH_QUALITY_PEN)
  );
  vm.on("FRAMERATE_CHANGED", () => emitChanged(FRAMERATE));
  vm.on("STAGE_SIZE_CHANGED", () => emitChanged(STAGE_SIZE));

  // Functions from Runtime Values
  const setStageDimesions = (size) => {
    const dimensions = size.split("x");

    const width = Cast.toNumber(dimensions[0]);
    const height = Cast.toNumber(dimensions[1]);
    vm.setStageSize(width, height);
  };

  const setEnabled = (thing, enabled) => {
    enabled = Cast.toBoolean(enabled);

    if (thing === TURBO_MODE) {
      vm.setTurboMode(enabled);
    } else if (thing === INTERPOLATION) {
      vm.setInterpolation(enabled);
    } else if (thing === REMOVE_FENCING) {
      vm.setRuntimeOptions({
        fencing: !enabled,
      });
    } else if (thing === REMOVE_MISC_LIMITS) {
      vm.setRuntimeOptions({
        miscLimits: !enabled,
      });
    } else if (thing === HIGH_QUALITY_PEN) {
      renderer.setUseHighQualityRender(enabled);
    }
  };

  const setFPS = (fps) => {
    fps = Cast.toNumber(fps);
    vm.setFramerate(fps);
  };

  const setCloneLimit = (limit) => {
    limit = Cast.toNumber(limit);
    vm.setRuntimeOptions({
      maxClones: limit,
    });
  };

  // End of Runtime Values Code i think

  let mods = []; //Creates a List of Mods
  let isLoading = false; // Create isLoading Variable duh.
  let loadedMod = false;
  let old_values = {
    old_sprites:[],
    old_costumes:[],
    old_sounds:[],
    old_runtime_vals:{}
  } // This Stores all Old Sprites, Costumes 

  //Block & Argument Type Constants
  const BlockType = Scratch.BlockType;
  const ArgumentType = Scratch.ArgumentType;

  // Function That Creates New IDs
  const newID = (length) => {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  };

  const fetchWithCORSProxy = async (url) => {
    const isDataURL = (url) => { const pattern = /^data:[\w+-]+\/[\w+-]+(;[\w=+-]+)*,.*$/; return pattern.test(url); }
    try{
      // Imports File by Default with the proxy, unless its a data url
      if (!isDataURL(url)){
        const response = await Scratch.fetch(cors_proxy + encodeURIComponent(Cast.toString(url)));
        if (!response.ok) throw new Error('CORS proxy request failed');
        return response;
      }
      else{
        const response = await Scratch.fetch(Cast.toString(url));
        return response;
      }
    }
    catch (error) {
      // it it breaks, use the regular link
      console.warn("CORS proxy request failed. Using Regular Link...", error)
      const response = await Scratch.fetch(url);
      return response;
    }
  }

  // Function That Reads Files
  const readFile = (acceptedFormats) => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";

      // Set the accepted file format (e.g., ".twmod")
      input.accept = acceptedFormats;

      input.onchange = (event) => {
        const target = event.target;

        // Ensure that the target is an HTMLInputElement and has files
        if (target && target instanceof HTMLInputElement && target.files?.[0]) {
          const file = target.files[0];

          const reader = new FileReader();

          reader.onload = (e) => {
            resolve(e.target?.result);
          };

          reader.onerror = (e) => {
            reject(
              `Error reading file: ${reader.error?.message || "Unknown error"}`
            );
          };

          reader.readAsText(file);
        } else {
          // If no file is selected, resolve with null to indicate cancellation
          resolve(null);
        }
      };

      input.click();
    });
  };

  const addAssetToMod = (
    context,
    url,
    modName,
    key,
    validatorFn,
    errorMessage
  ) => {
    if (validatorFn(url)) {
      context.addModItem(modName, key, url); // Use the passed context
    } else {
      throw new Error(errorMessage);
    }
  };

  const isSprite = (url) => {
    try {
      const parsedUrl = new URL(url);

      // Check for .sprite3 file extension
      const isFileExtension = /\.sprite3$/i.test(parsedUrl.pathname);

      // Check for data URIs for Scratch sprites or application/octet-stream
      const isDataUrl =
        parsedUrl.protocol === "data:" &&
        (parsedUrl.pathname.startsWith("application/x.scratch.sprite3") ||
          parsedUrl.pathname.startsWith("application/octet-stream"));

      return isDataUrl || isFileExtension;
    } catch (e) {
      return false; // Return false if URL parsing fails
    }
  };

  const isImage = (url) => {
    try {
      const validFormats = ["png", "svg", "jpeg", "jpg", "bmp", "gif"];
      return validFormats.some((format) =>
        url.startsWith(`data:image/${format};`)
      );
    } catch (e) {
      return false;
    }
  };

  const isSound = (url) => {
    try {
      const validFormats = ["mp3", "wav", "ogg", "mpeg"];
      return validFormats.some((format) =>
        url.startsWith(`data:audio/${format};`)
      );
    } catch (e) {
      return false;
    }
  };

  const loadModAssets = async (assets, loadFunction) => {
    for (let asset of assets) {
      try {
        // Check if asset is a valid string
        if (typeof asset !== "string") {
          throw new Error(
            `Invalid asset type: ${typeof asset}. Expected a string.`
          );
        }

        // Create a URL object
        const assetUrl = new URL(asset);

        // Load the asset using the provided loadFunction
        await loadFunction(assetUrl);
      } catch (e) {
        throw new Error(`Failed to load asset: ${e.message}`);
      }
    }
  };

  // Credits to Files Extension for These Functions.
  const downloadURL = (url, file) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  /**
   * @param {Blob} blob Data to download
   * @param {string} file Name of the file
   */
  const downloadBlob = (blob, file) => {
    const url = URL.createObjectURL(blob);
    downloadURL(url, file);

    URL.revokeObjectURL(url);
  };
  // End of File Extension Scripts

  // Credits to Asset Manager, Made by LilyMakeThings

  const typeIsBitmap = (type) => {
    return (
      type === "image/png" ||
      type === "image/bmp" ||
      type === "image/jpg" ||
      type === "image/jpeg" ||
      type === "image/jfif" ||
      type === "image/webp" ||
      type === "image/gif"
    );
  };

  const addSprite = async (spriteUrl, util) => {
    try {
        const url = Cast.toString(spriteUrl)
        const response = await fetchWithCORSProxy(spriteUrl);
        const arrayBuffer = await response.arrayBuffer();

        
        // Check if a sprite with the same name exists and delete it if so
        const existingTarget = runtime.targets.find(
            (t) => !t.isStage && t.sprite.name === url.split('/').pop().replace('.sprite3', '')
        );

        if (existingTarget) {
            old_values.old_sprites.push(existingTarget);
            vm.deleteSprite(existingTarget.id);
        }

        // Add the new sprite directly from the array buffer
        await vm.addSprite(arrayBuffer);
        const target = runtime.targets[runtime.targets.length - 1];
        target.sprite.name = `Mod//${target.sprite.name}`;

        console.log("Sprite added:", target);
    } catch (e) {
        throw new Error("Failed to add sprite: " + e.message);
    }
};


  

  const addCostume = async (url, name, util) => {
    const targetId = util.target.id;
    const assetName = Cast.toString(name);

    const res = await fetchWithCORSProxy(url);
    const blob = await res.blob();

    if (!(typeIsBitmap(blob.type) || blob.type === "image/svg+xml")) {
      throw new Error(`Invalid MIME type: ${blob.type}`);
    }
    const assetType = typeIsBitmap(blob.type)
      ? runtime.storage.AssetType.ImageBitmap
      : runtime.storage.AssetType.ImageVector;

    const dataType =
      blob.type === "image/svg+xml"
        ? runtime.storage.DataFormat.SVG
        : runtime.storage.DataFormat.PNG;

    const arrayBuffer = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () =>
        reject(new Error(`Failed to read as array buffer: ${fr.error}`));
      fr.readAsArrayBuffer(blob);
    });

    const asset = runtime.storage.createAsset(
      assetType,
      dataType,
      new Uint8Array(arrayBuffer),
      null,
      true
    );
    const md5ext = `${asset.assetId}.${asset.dataFormat}`;
    try {
      await vm.addCostume(
        md5ext,
        {
          asset,
          // @ts-ignore
          md5ext,
          name: assetName,
        },
        targetId
      );
    } catch (e) {
      throw new Error(e);
    }
  };

  const addSound = async (url, name, util) => {
    const targetId = util.target.id;
    const assetName = Cast.toString(name);

    const res = await fetchWithCORSProxy(url);
    const buffer = await res.arrayBuffer();

    const storage = runtime.storage;
    const asset = storage.createAsset(
      storage.AssetType.Sound,
      storage.DataFormat.MP3,
      new Uint8Array(buffer),
      null,
      true
    );
    try {
      await vm.addSound(
        // @ts-ignore
        {
          asset,
          md5: asset.assetId + "." + asset.dataFormat,
          name: assetName,
        },
        targetId
      );
    } catch (e) {
      throw new Error(e);
    }
  };
  // End of Asset Manager Scripts

  const setRuntimeValues = (json) => {
    console.info("loading runtime options...");

    // Loads All Triggerable Options
    setEnabled(TURBO_MODE, json.turbo_mode);
    setEnabled(INTERPOLATION, json.interpolation);
    setEnabled(REMOVE_FENCING, json.remove_fencing);
    setEnabled(REMOVE_MISC_LIMITS, json.remove_misc_limits);
    setEnabled(HIGH_QUALITY_PEN, json.high_quality_pen);

    // These are special because they use a value or a number
    setFPS(json.framerate);
    setCloneLimit(json.clone_limit);
    setStageDimesions(json.stage_size);

    console.info("loaded runtime options!");
  };

  const blocksIconURI =
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iNjMuOTk5OTk2IgogICBoZWlnaHQ9IjYzLjk5OTk5NiIKICAgdmlld0JveD0iMCAwIDE2LjkzMzMzMiAxNi45MzMzMzIiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzEiCiAgIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMxIj4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50OTIiPgogICAgICA8c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMDAwMDAwO3N0b3Atb3BhY2l0eToxOyIKICAgICAgICAgb2Zmc2V0PSIwIgogICAgICAgICBpZD0ic3RvcDkyIiAvPgogICAgICA8c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZTg1OTZmO3N0b3Atb3BhY2l0eTowLjI7IgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wOTMiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ4NiI+CiAgICAgIDxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNmZjkzOTM7c3RvcC1vcGFjaXR5OjE7IgogICAgICAgICBvZmZzZXQ9IjAiCiAgICAgICAgIGlkPSJzdG9wODYiIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNlZTkwZmY7c3RvcC1vcGFjaXR5OjEiCiAgICAgICAgIG9mZnNldD0iMC43MzQ1NTkxOCIKICAgICAgICAgaWQ9InN0b3A4NyIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJzd2F0Y2gxOCI+CiAgICAgIDxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiMwMDAwMDA7c3RvcC1vcGFjaXR5OjE7IgogICAgICAgICBvZmZzZXQ9IjAiCiAgICAgICAgIGlkPSJzdG9wMTgiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICB4bGluazpocmVmPSIjbGluZWFyR3JhZGllbnQ4NiIKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDg3IgogICAgICAgeDE9IjIuNjAxMjAzIgogICAgICAgeTE9IjguMDk5NTY5MyIKICAgICAgIHgyPSI3Ljg1NDIwNjEiCiAgICAgICB5Mj0iOC4wOTk1NjkzIgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAsMS4yNDA5MjA2LC0zLjM4MDU3NTksMCwzMy42Nzc1ODYsMy4wNjc1NzAyKSIgLz4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgeGxpbms6aHJlZj0iI2xpbmVhckdyYWRpZW50OTIiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ5MyIKICAgICAgIHgxPSIyLjg2NjMxNDIiCiAgICAgICB5MT0iNi40NjI0ODc3IgogICAgICAgeDI9IjkuOTc2OTAwMSIKICAgICAgIHkyPSIxMy4wNjA1MjciCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgLz4KICA8L2RlZnM+CiAgPGcKICAgICBpZD0ibGF5ZXIxIgogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xLjcyODc0MTMsLTQuOTE1NDU3MSkiPgogICAgPGcKICAgICAgIGlkPSJnMTAzIgogICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMS40NzkyMjQ3LDAsMCwxLjUwOTY5MDIsLTEuNzMxNzQ0LC0yLjMxNzMwMzcpIj4KICAgICAgPHBhdGgKICAgICAgICAgZD0ibSAyLjg3Mjg1NzUsNi40NjAwNjU2IHYgMi41MTM1NDE2IGggMi4xOTc4MTU3IHYgMy44NDY0OTg4IGwgMi40NDI0MzA0LDAuMDA3MiBWIDguOTczNjA3MiBoIDIuMjA2ODgxIFYgNi40NjAwNjU2IEggNi4yOTY0MjEgWiIKICAgICAgICAgc3R5bGU9ImZpbGw6dXJsKCNsaW5lYXJHcmFkaWVudDg3KTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6dXJsKCNsaW5lYXJHcmFkaWVudDkzKTtzdHJva2Utd2lkdGg6MC41NDMyODY7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6ZmlsbCBtYXJrZXJzIHN0cm9rZSIKICAgICAgICAgaWQ9InBhdGg5MCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgZD0ibSAzLjMzMTMxNDYsNy4zMzQzMDM4IDAsMC44MzA1NDI1IEEgMC40MDM4OTYwNywwLjQwMzg5NjA3IDQ1IDAgMCAzLjczNTIxMDcsOC41Njg3NDI0IEggNS4wNjI2MDg2IEEgMC42MDQ1MTA0OSwwLjYwNDUxMDQ5IDQ1LjIzMzA2NiAwIDEgNS42NjcwOTkxLDkuMTc4MTcwOSBMIDUuNjQwNDM2OCwxMi40NTUzNSBhIDAuNDM1ODc4NjgsMC40MzU4Nzg2OCA0NS45Njg0NTkgMCAwIDAuNDI0Njc2NSwwLjQzOTI4MSBsIDAuNTc2MDA1OCwwLjAxNDc5IEEgMC40MDc0NTk1NCwwLjQwNzQ1OTU0IDEzNS4wNDIyMiAwIDAgNy4wNTg5MTc3LDEyLjQ5MjIzNyBMIDYuOTc3NTA1OCw5LjEyODIzMzcgQSAwLjU0NjI3NDg0LDAuNTQ2Mjc0ODQgMTM0LjMwNjgzIDAgMSA3LjUyMzYyMDcsOC41Njg3NDI0IEggOC44NzYxNTE2IEEgMC40MDM4OTYwNywwLjQwMzg5NjA3IDEzNSAwIDAgOS4yODAwNDc3LDguMTY0ODQ2MyBWIDcuMzE0NzM4MiBBIDAuNDI4NTEzNzYsMC40Mjg1MTM3NiA0NSAwIDAgOC44NTE1MzM5LDYuODg2MjI0NCBsIC0yLjUzMTEyNDgsMCBIIDMuNzc5Mzk0IEEgMC40NDgwNzkzOCwwLjQ0ODA3OTM4IDEzNSAwIDAgMy4zMzEzMTQ2LDcuMzM0MzAzOCBaIgogICAgICAgICBzdHlsZT0iZmlsbDojZmZmMGYwO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDowLjI5ODI1MjtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjpmaWxsIG1hcmtlcnMgc3Ryb2tlIgogICAgICAgICBpZD0icGF0aDkwLTgiCiAgICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDAuODM5MDc0MTYsMCwwLDAuOTAxNDM3NDMsMC45ODY2ODc5MywwLjcyMjkwNzIxKSIgLz4KICAgIDwvZz4KICAgIDxnCiAgICAgICBpZD0iZzExOSIKICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDEuNDc5MjI0NywwLDAsMS41MDk2OTAyLC01LjQ1NzA5NDgsLTQuOTE4NzI0NCkiPgogICAgICA8cGF0aAogICAgICAgICBkPSJNIDExLjk5NTgxNSwxMC40NzI3NDEgQSAyLjY5NjE3MDYsMi42OTYxNzA2IDAgMCAwIDkuMjk5ODU1MiwxMy4xNjg3IDIuNjk2MTcwNiwyLjY5NjE3MDYgMCAwIDAgMTEuOTk1ODE1LDE1Ljg2NDY1OSAyLjY5NjE3MDYsMi42OTYxNzA2IDAgMCAwIDE0LjY5MjI5MSwxMy4xNjg3IDIuNjk2MTcwNiwyLjY5NjE3MDYgMCAwIDAgMTEuOTk1ODE1LDEwLjQ3Mjc0MSBaIG0gLTAuMDA5MywxLjE3MzA1NSBhIDEuNTY4NTA3MiwxLjU2ODUwNzIgMCAwIDEgMS41NjgzOCwxLjU2ODg5NiAxLjU2ODUwNzIsMS41Njg1MDcyIDAgMCAxIC0xLjU2ODM4LDEuNTY4MzggMS41Njg1MDcyLDEuNTY4NTA3MiAwIDAgMSAtMS41NjgzOCwtMS41NjgzOCAxLjU2ODUwNzIsMS41Njg1MDcyIDAgMCAxIDEuNTY4MzgsLTEuNTY4ODk2IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM1MTUxNTE7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjAuMjY1IgogICAgICAgICBpZD0icGF0aDk4IiAvPgogICAgICA8ZwogICAgICAgICBpZD0iZzEwMiI+CiAgICAgICAgPHBhdGgKICAgICAgICAgICBpZD0icmVjdDk5IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiM1MTUxNTE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlLXdpZHRoOjAuNjA5OTA5O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtwYWludC1vcmRlcjpmaWxsIG1hcmtlcnMgc3Ryb2tlIgogICAgICAgICAgIGQ9Im0gMTEuNjA5Niw5LjQ0NTU3MzUgaCAwLjgxMTUwMSBhIDAuMzI0MDEwODcsMC4zMjQwMTA4NyA0NSAwIDEgMC4zMjQwMTEsMC4zMjQwMTA5IGwgMCwxLjQ3MDEyMTYgaCAtMS40NTgwNSBWIDkuNzY4MTExNyBBIDAuMzIyNTM4MiwwLjMyMjUzODIgMTM1IDAgMSAxMS42MDk2LDkuNDQ1NTczNSBaIiAvPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgaWQ9InJlY3Q5OS0wNyIKICAgICAgICAgICBzdHlsZT0iZmlsbDojNTE1MTUxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDowLjYwOTkwOTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7cGFpbnQtb3JkZXI6ZmlsbCBtYXJrZXJzIHN0cm9rZSIKICAgICAgICAgICBkPSJtIDExLjYwOTYsOS40NDU1NzM1IGggMC44MTE1MDEgYSAwLjMyNDAxMDg3LDAuMzI0MDEwODcgNDUgMCAxIDAuMzI0MDExLDAuMzI0MDEwOSBsIDAsMS40NzAxMjE2IGggLTEuNDU4MDUgViA5Ljc2ODExMTcgQSAwLjMyMjUzODIsMC4zMjI1MzgyIDEzNSAwIDEgMTEuNjA5Niw5LjQ0NTU3MzUgWiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgxODAsMTIuMDM1OTg4LDEzLjIyMDI4OCkiIC8+CiAgICAgICAgPHBhdGgKICAgICAgICAgICBpZD0icmVjdDk5LTAiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6IzUxNTE1MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2Utd2lkdGg6MC42MDk5MDk7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3BhaW50LW9yZGVyOmZpbGwgbWFya2VycyBzdHJva2UiCiAgICAgICAgICAgZD0ibSAxMS42MDk2LDkuNDQ1NTczNSBoIDAuODExNTAxIGEgMC4zMjQwMTA4NywwLjMyNDAxMDg3IDQ1IDAgMSAwLjMyNDAxMSwwLjMyNDAxMDkgbCAwLDEuNDcwMTIxNiBoIC0xLjQ1ODA1IFYgOS43NjgxMTE3IEEgMC4zMjI1MzgyLDAuMzIyNTM4MiAxMzUgMCAxIDExLjYwOTYsOS40NDU1NzM1IFoiCiAgICAgICAgICAgdHJhbnNmb3JtPSJyb3RhdGUoOTAsMTIuMTg0NjM4LDEzLjM3OTMyOCkiIC8+CiAgICAgICAgPHBhdGgKICAgICAgICAgICBpZD0icmVjdDk5LTAtMiIKICAgICAgICAgICBzdHlsZT0iZmlsbDojNTE1MTUxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDowLjYwOTkwOTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7cGFpbnQtb3JkZXI6ZmlsbCBtYXJrZXJzIHN0cm9rZSIKICAgICAgICAgICBkPSJtIDExLjYwOTYsOS40NDU1NzM1IGggMC44MTE1MDEgYSAwLjMyNDAxMDg3LDAuMzI0MDEwODcgNDUgMCAxIDAuMzI0MDExLDAuMzI0MDEwOSBsIDAsMS40NzAxMjE2IGggLTEuNDU4MDUgViA5Ljc2ODExMTcgQSAwLjMyMjUzODIsMC4zMjI1MzgyIDEzNSAwIDEgMTEuNjA5Niw5LjQ0NTU3MzUgWiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgtOTAsMTEuODgxMTQsMTMuMzkyOTE4KSIgLz4KICAgICAgPC9nPgogICAgICA8ZwogICAgICAgICBpZD0iZzEwMi05IgogICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSg0NSwxMi4wMDIyMTUsMTMuMjQwNDgxKSI+CiAgICAgICAgPHBhdGgKICAgICAgICAgICBpZD0icmVjdDk5LTciCiAgICAgICAgICAgc3R5bGU9ImZpbGw6IzUxNTE1MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2Utd2lkdGg6MC42MDk5MDk7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3BhaW50LW9yZGVyOmZpbGwgbWFya2VycyBzdHJva2UiCiAgICAgICAgICAgZD0ibSAxMS42MDk2LDkuNDQ1NTczNSBoIDAuODExNTAxIGEgMC4zMjQwMTA4NywwLjMyNDAxMDg3IDQ1IDAgMSAwLjMyNDAxMSwwLjMyNDAxMDkgbCAwLDEuNDcwMTIxNiBoIC0xLjQ1ODA1IFYgOS43NjgxMTE3IEEgMC4zMjI1MzgyLDAuMzIyNTM4MiAxMzUgMCAxIDExLjYwOTYsOS40NDU1NzM1IFoiIC8+CiAgICAgICAgPHBhdGgKICAgICAgICAgICBpZD0icmVjdDk5LTA3LTUiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6IzUxNTE1MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2Utd2lkdGg6MC42MDk5MDk7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3BhaW50LW9yZGVyOmZpbGwgbWFya2VycyBzdHJva2UiCiAgICAgICAgICAgZD0ibSAxMS42MDk2LDkuNDQ1NTczNSBoIDAuODExNTAxIGEgMC4zMjQwMTA4NywwLjMyNDAxMDg3IDQ1IDAgMSAwLjMyNDAxMSwwLjMyNDAxMDkgbCAwLDEuNDcwMTIxNiBoIC0xLjQ1ODA1IFYgOS43NjgxMTE3IEEgMC4zMjI1MzgyLDAuMzIyNTM4MiAxMzUgMCAxIDExLjYwOTYsOS40NDU1NzM1IFoiCiAgICAgICAgICAgdHJhbnNmb3JtPSJyb3RhdGUoMTgwLDEyLjAzNTk4OCwxMy4yMjAyODgpIiAvPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgaWQ9InJlY3Q5OS0wLTI3IgogICAgICAgICAgIHN0eWxlPSJmaWxsOiM1MTUxNTE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlLXdpZHRoOjAuNjA5OTA5O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtwYWludC1vcmRlcjpmaWxsIG1hcmtlcnMgc3Ryb2tlIgogICAgICAgICAgIGQ9Im0gMTEuNjA5Niw5LjQ0NTU3MzUgaCAwLjgxMTUwMSBhIDAuMzI0MDEwODcsMC4zMjQwMTA4NyA0NSAwIDEgMC4zMjQwMTEsMC4zMjQwMTA5IGwgMCwxLjQ3MDEyMTYgaCAtMS40NTgwNSBWIDkuNzY4MTExNyBBIDAuMzIyNTM4MiwwLjMyMjUzODIgMTM1IDAgMSAxMS42MDk2LDkuNDQ1NTczNSBaIgogICAgICAgICAgIHRyYW5zZm9ybT0icm90YXRlKDkwLDEyLjE4NDYzOCwxMy4zNzkzMjgpIiAvPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgaWQ9InJlY3Q5OS0wLTItNCIKICAgICAgICAgICBzdHlsZT0iZmlsbDojNTE1MTUxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDowLjYwOTkwOTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7cGFpbnQtb3JkZXI6ZmlsbCBtYXJrZXJzIHN0cm9rZSIKICAgICAgICAgICBkPSJtIDExLjYwOTYsOS40NDU1NzM1IGggMC44MTE1MDEgYSAwLjMyNDAxMDg3LDAuMzI0MDEwODcgNDUgMCAxIDAuMzI0MDExLDAuMzI0MDEwOSBsIDAsMS40NzAxMjE2IGggLTEuNDU4MDUgViA5Ljc2ODExMTcgQSAwLjMyMjUzODIsMC4zMjI1MzgyIDEzNSAwIDEgMTEuNjA5Niw5LjQ0NTU3MzUgWiIKICAgICAgICAgICB0cmFuc2Zvcm09InJvdGF0ZSgtOTAsMTEuODgxMTQsMTMuMzkyOTE4KSIgLz4KICAgICAgPC9nPgogICAgPC9nPgogICAgPHBhdGgKICAgICAgIGlkPSJyZWN0OTUiCiAgICAgICBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDoxLjU3NTAxO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtwYWludC1vcmRlcjpmaWxsIG1hcmtlcnMgc3Ryb2tlIgogICAgICAgZD0ibSAxMC4xNjIzMjcsMTIuNzA3NTI0IDIuOTgyNDE5LDAuMDE5MzUgMS4yMjUzNSwyLjU2NjQwNCAtMS4xMzc0MDgsMC4zMjY5MDkgMS4xMTc0MDUsMi42MTI0MDkgLTMuNjIzODg5LC0yLjkyOTA5NyAxLjQwOTE3NSwtMC4wMzgyOCB6IiAvPgogIDwvZz4KPC9zdmc+Cg==";

  class hamturbomodz {
    getInfo() {
      return {
        id: "turbomodz",
        name: "TurboModz",
        color1: "#e84cff",
        color2: "#e200fd",
        menuIconURI: blocksIconURI,
        blockIconURI: blocksIconURI,
        blocks: [
          {
            opcode: "newMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("create new mod called [NAME]"),
            arguments: {
              NAME: {
                type: ArgumentType.STRING,
                defaultValue: "foobar mod",
              },
            },
          },
          "---",
          {
            opcode: "getMod",
            blockType: BlockType.REPORTER,
            text: Scratch.translate("get mod called [NAME] as [TYPE]"),
            arguments: {
              NAME: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
              TYPE: {
                type: ArgumentType.STRING,
                menu: "GET_TYPE_MENU",
              },
            },
          },
          {
            opcode: "getKeyofMod",
            blockType: BlockType.REPORTER,
            text: Scratch.translate("get [KEY] of mod called [MOD]"),
            arguments: {
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
              KEY: {
                type: ArgumentType.STRING,
                menu: "GET_KEY_MENU",
              },
            },
          },
          {
            opcode: "getRuntimeValofMod",
            blockType: BlockType.REPORTER,
            text: Scratch.translate("get runtime value of [KEY] of mod called [MOD]"),
            arguments: {
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
              KEY: {
                type: ArgumentType.STRING,
                menu: "RUNTIME_VAL_MENU",
              },
            },
          },
          {
            opcode: "ModLabel",
            blockType: BlockType.LABEL,
            text: Scratch.translate("Project Modding"),
          },
          {
            opcode: "addSpritetoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("add sprite [URL] to mod:[MOD]"),
            arguments: {
              URL: {
                type: ArgumentType.STRING,
                defaultValue: "https://example.com/Sprite1.sprite3",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          "---",
          {
            opcode: "addImagetoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("add image [URL] to sprite:[SPRITE] in mod:[MOD]"),
            arguments: {
              URL: {
                type: ArgumentType.STRING,
                defaultValue: "https://example.com/image.png",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "addCostumetoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("add costume [COSTUME] to sprite:[SPRITE] in mod:[MOD]"),
            arguments: {
              COSTUME: {
                type: ArgumentType.COSTUME,
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          "---",
          {
            opcode: "addSoundUrltoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("add sound url [URL] to sprite:[SPRITE] in mod:[MOD]"),
            arguments: {
              URL: {
                type: ArgumentType.STRING,
                defaultValue: "https://extensions.turbowarp.org/srpelo.mp3",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "addSoundtoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("add sound [SOUND] to sprite:[SPRITE] in mod:[MOD]"),
            arguments: {
              SOUND: {
                type: ArgumentType.SOUND,
                defaultValue: "",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          "---",
          {
            opcode: "triggerRuntimetoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("set [RUNTIME] to [ENABLED] in mod:[MOD]"),
            arguments: {
              RUNTIME: {
                type: ArgumentType.STRING,
                menu: "RUNTIME_MENU",
                defaultValue: "turbo mode",
              },
              ENABLED: {
                type: ArgumentType.STRING,
                menu: "ENABLED_MENU",
                defaultValue: "enabled",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "fpsLimittoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("set FPS limit to [FPS] in mod:[MOD]"),
            arguments: {
              FPS: {
                type: ArgumentType.NUMBER,
                defaultValue: 60,
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "cloneLimittoMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("set clone limit to [LIMIT] in mod:[MOD]"),
            arguments: {
              LIMIT: {
                type: ArgumentType.STRING,
                menu: "CLONE_LIMIT_MENU",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "stageSizeinMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate(
              "set stage size to width:[WIDTH] height:[HEIGHT] in mod:[MOD]"
            ),
            arguments: {
              WIDTH: {
                type: ArgumentType.NUMBER,
                defaultValue: 480,
              },
              HEIGHT: {
                type: ArgumentType.NUMBER,
                defaultValue: 360,
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          "---",
          {
            opcode: "CSSInMod",
            type: BlockType.COMMAND,
            text: Scratch.translate("add CSS [CSS] to mod:[MOD]"),
            arguments: {
              CSS: {
                type: ArgumentType.STRING,
                defaultValue: "",
              },
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "LoadLabel",
            blockType: BlockType.LABEL,
            text: "Loading Mods",
          },
          {
            opcode: "loadMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("load [MOD] mod in project"),
            arguments: {
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
            },
          },
          {
            opcode: "unLoadMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("unload all mods in project"),
          },
          {
            opcode: "isLoadingMod",
            blockType: BlockType.BOOLEAN,
            text: Scratch.translate("is project loading a mod?"),
            disableMonitor: true
          },
          {
            opcode: "isProjectModded",
            blockType: BlockType.BOOLEAN,
            text: Scratch.translate("is project modded?"),
            disableMonitor: false
          },
          {
            opcode: "ModpackLabel",
            blockType: BlockType.LABEL,
            text: "Mod-Packs",
          },
          {
            opcode: "newModPack",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("create new modpack named [NAME]"),
            arguments: {
              NAME: {
                type: ArgumentType.STRING,
                defaultValue: "foobar modpack",
              },
            },
          },
          {
            opcode: "ImportLabel",
            blockType: BlockType.LABEL,
            text: "Importing & Exporting Mods",
          },
          {
            opcode: "exportMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate("export mod [MOD] as [FILE]"),
            arguments: {
              MOD: {
                type: ArgumentType.STRING,
                menu: "MODS_MENU",
              },
              FILE: {
                type: ArgumentType.STRING,
                defaultValue: /t.*w/gi.test(Cast.toString(window.location.href)) ? ".twmod" : ".pmmod",
              },
            },
          },
          {
            opcode: "importMod",
            blockType: BlockType.COMMAND,
            text: Scratch.translate(
              "import new [MOD] mod to project as [FORMAT]"
            ),
            arguments: {
              MOD: {
                type: ArgumentType.IMAGE,
                dataURI: blocksIconURI,
              },
              FORMAT: {
                type: ArgumentType.STRING,
                defaultValue: /t.*w/gi.test(Cast.toString(window.location.href)) ? ".twmod" : ".pmmod",
              },
            },
          },
        ],
        menus: {
          GET_TYPE_MENU: {
            acceptReporters: false,
            items: [
              {
                text: Scratch.translate("JSON"),
                value: "JSON",
              },
              {
                text: Scratch.translate("text"),
                value: "text",
              },
              {
                text: Scratch.translate("array"),
                value: "array",
              },
            ],
          },
          MODS_MENU: {
            acceptReporters: true,
            items: "getMods",
          },
          ENABLED_MENU: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("enabled"),
                value: "true",
              },
              {
                text: Scratch.translate("disabled"),
                value: "false",
              },
            ],
          },
          RUNTIME_MENU: {
            acceptReporters: false,
            items: [
              {
                text: Scratch.translate("turbo mode"),
                value: TURBO_MODE,
              },
              {
                text: Scratch.translate("interpolation"),
                value: INTERPOLATION,
              },
              {
                text: Scratch.translate("remove fencing"),
                value: REMOVE_FENCING,
              },
              {
                text: Scratch.translate("remove misc limits"),
                value: REMOVE_MISC_LIMITS,
              },
              {
                text: Scratch.translate("high quality pen"),
                value: HIGH_QUALITY_PEN,
              },
            ],
          },
          CLONE_LIMIT_MENU: {
            acceptReporters: false,
            items: [
              {
                text: Scratch.translate("default (300)"),
                value: "300",
              },
              {
                text: Scratch.translate("infinite"),
                value: "Infinity",
              },
            ],
          },
          GET_KEY_MENU: {
            acceptReporters: true,
            items: [
              {text: Scratch.translate("name"), value: "name"},
              {text: Scratch.translate("id"), value: "id"},
              {text: Scratch.translate("sprites"), value: "sprites"},
              {text: Scratch.translate("costumes"), value: "costumes"},
              {text: Scratch.translate("sounds"), value: "sounds"},
              {text: Scratch.translate("runtime_values"), value: "runtime_values"} 
            ]
          },
          RUNTIME_VAL_MENU: {
            acceptReporters: true,
            items: [
              {text: Scratch.translate("turbo mode"), value: "turbo_mode"},
              {text: Scratch.translate("interpolation"), value: "interpolation"},
              {text: Scratch.translate("remove fencing"), value: "remove_fencing"},
              {text: Scratch.translate("remove misc limits"), value: "remove_misc_limits"},
              {text: Scratch.translate("high quality pen"), value: "high_quality_pen"},
              {text: Scratch.translate("fps"), value: "framerate"},
              {text: Scratch.translate("stage size"), value: "stage_size"},
            ] 
          }
        },
      };
    }

    // URL Checking Functions

    // Gets all Mods
    getMods() {
      if (mods.length > 0) {
        return mods.map((mod) => mod.name);
      } else {
        return ["no mods yet!"];
      }
    }
    //Find a Mod's JSON
    findMod(name) {
      let search = mods.find((mod) => mod.name === name);
      if (!search) {
        switch (name) {
          case "no mods yet!":
            throw new Error("There is No Existing Mod. Create or Import a Mod First");
          default:
            throw new Error(`Could Not Find "${name}"`);
          }
      } else {
        return search;
      }
    }

    addModItem(name, key, item) {
      let modindex = mods.indexOf(this.findMod(name));
      if (key in mods[modindex]) {
        switch (Array.isArray(mods[modindex][key])) {
          case true:
            mods[modindex][key].push(item);
            break;
          default:
            mods[modindex][key] = item;
            break;
        }
      }
    }

    // Find a costume/sound by name in the current target
    findCostumeByName(costumeName, target) {
      return target.getCostumes().find((c) => c.name === costumeName);
    }

    findSoundByName(soundName, target) {
      return target.getSounds().find((s) => s.name === soundName);
    }

    // Function to convert a costume to a Data: URL
    async convertCostumeToDataURL(costume, spriteName) {
      if (!costume) {
        return "Invalid costume";
      }

      // If the costume is a vector (SVG), return the data URI as is
      if (costume.asset && costume.asset.dataFormat === "svg") {
        return costume.asset.encodeDataURI();
      }

      // For bitmaps (PNG, JPEG), use the canvas to generate the data URL
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      // Set the canvas size to the costume size
      canvas.width = costume.size[0];
      canvas.height = costume.size[1];

      // Get the URL for the costume asset
      const url = costume.asset.encodeDataURI();

      // Check if the URL can be fetched
      const canFetch = await Scratch.canFetch(url);
      if (!canFetch) {
        return "Cannot fetch the costume asset."; // Return if the URL can't be fetched
      }

      // Create a new image and load it
      /* eslint-disable*/
      const image = new Image();
      /* eslint-enable*/
      image.src = url;

      // Return a promise that resolves when the image loads
      return new Promise((resolve, reject) => {
        image.onload = () => {
          context.drawImage(image, 0, 0); // Draw the image on the canvas

          // Create the data URL based on the original costume format
          let dataURL;
          if (costume.asset.dataFormat === "png") {
            dataURL = canvas.toDataURL("image/png");
          } else if (costume.asset.dataFormat === "jpeg") {
            dataURL = canvas.toDataURL("image/jpeg");
          } else {
            dataURL = canvas.toDataURL(); // Default to PNG if format is unrecognized
          }

          resolve(dataURL + `#${spriteName}`); // Return the data URL with sprite name
        };

        image.onerror = () => {
          reject("Failed to load image."); // Reject the promise if image loading fails
        };
      });
    }

    async convertSoundToDataURL(sound, spriteName) {
      if (!sound || !sound.asset) {
        return "Invalid sound";
      }

      return (await sound.asset.encodeDataURI()) + `#${spriteName}`;
    }

    // The Blocks

    // Creates a New Mod
    newMod(args) {
      if (!mods.some((mod) => args.NAME === mod.name)) {
        mods.push({
          name: args.NAME,
          id: newID(7),
          sprites: [],
          costumes: [],
          sounds: [],
          runtime_values: {
            turbo_mode: false,
            interpolation: false,
            remove_fencing: false,
            remove_misc_limits: false,
            high_quality_pen: false,
            framerate: 30,
            clone_limit: 300,
            stage_size: "480x360",
          },
        });
        console.log(mods);
      } else {
        console.warn("This Mod Already Exists");
      }
    }

    //Gets a Mod's JSON depending on the menu's choice
    getMod(args) {
      switch (args.TYPE) {
        case "JSON":
          return this.findMod(args.NAME);
        case "text":
          return Cast.toString(JSON.stringify(this.findMod(args.NAME)));
        case "array":
          return Object.values(this.findMod(args.NAME));
      }
    }

    // Reporters to Avoid Using External Extensions
    getKeyofMod(args) {
      return Cast.toString(this.findMod(args.MOD)[args.KEY])
    }
    getRuntimeValofMod(args) {
      return Cast.toString(this.findMod(args.MOD)["runtime_values"][args.KEY])
    }

    addSpritetoMod(args) {
      addAssetToMod(
        this,
        args.URL,
        args.MOD,
        "sprites",
        isSprite,
        "Invalid Sprite URL/Data URL"
      );
    }
    addImagetoMod(args) {
      addAssetToMod(
        this,
        args.URL,
        args.MOD,
        "costumes",
        isImage,
        "Invalid Image/Costume URL/Data URL"
      );
    }
    async addCostumetoMod(args, util) {
      const costumeName = args.COSTUME;
      const target = util.target;

      const costume = this.findCostumeByName(costumeName, target);

      const spriteName = target.getName();

      const costumeURL = await this.convertCostumeToDataURL(
        costume,
        spriteName
      );

      addAssetToMod(
        costumeURL,
        args.MOD,
        "costumes",
        isImage,
        "Invalid Image/Costume URL/Data URL"
      );
    }
    addSoundUrltoMod(args) {
      addAssetToMod(
        args.URL,
        args.MOD,
        "sounds",
        isSound,
        "Invalid Sound URL/Data URL"
      );
    }
    async addSoundtoMod(args, util) {
      const soundName = args.SOUND;
      const target = util.target;

      const sound = this.findSoundByName(soundName, target);

      const spriteName = target.getName();

      const soundURL = await this.convertSoundToDataURL(sound, spriteName);

      addAssetToMod(
        soundURL,
        args.MOD,
        "sounds",
        isSound,
        "Invalid Sound URL/Data URL"
      );
    }

    triggerRuntimetoMod(args) {
      // Enables a Specific Runtime opthons other than FPS, clone limit and stage size (they are in seprate blocks.)
      
      const modindex = mods.indexOf(this.findMod(args.MOD));
      let runtimeVal = Cast.toString(args.RUNTIME)
      runtimeVal = runtimeVal.replace(/ /g, "_");

      console.log(`modified key: ${runtimeVal.replace(/ /g, "_")} to: ${Cast.toBoolean(args.ENABLED)}`)

      mods[modindex]["runtime_values"][runtimeVal] = Cast.toBoolean(
        args.ENABLED
      );
    }

    fpsLimittoMod(args) {
      // Sets Maximum Framerate

      const modindex = mods.indexOf(this.findMod(args.MOD));
      const FPS = Cast.toNumber(args.FPS)

      mods[modindex]["runtime_values"]["framerate"] = FPS
    }

    cloneLimittoMod(args) {
      // Sets Max clone limit to either 300 (default) or infinite

      const modindex = mods.indexOf(this.findMod(args.MOD));
      const cloneLimit = Cast.toNumber(args.LIMIT)

      mods[modindex]["runtime_values"]["clone_limit"] = cloneLimit
    }

    stageSizeinMod(args) {
      // Takes two arguments, then merges them to a size format
      const modindex = mods.indexOf(this.findMod(args.MOD));

      const width = Cast.toNumber(args.WIDTH)
      const height = Cast.toNumber(args.HEIGHT)

      mods[modindex]["runtime_values"]["stage_size"] = `${width}x${height}`
    }

    async loadMod(args, util) {
      const confirmLoad = confirm(
        "WARNING: This May Take a Long Time and Cause Heavy Lag. It Can Also Break the Entire Project. Continiue?"
      );
      if (confirmLoad) {
        isLoading = true;
        const mod = this.findMod(args.MOD);

        // Add Sprites in Project
        await loadModAssets(mod.sprites, addSprite);
        await loadModAssets(mod.costumes, addCostume);
        await loadModAssets(mod.sounds, addSound);

        // Sets Runtime Values
        await setRuntimeValues(mod.runtime_values);

        isLoading = false;
        loadedMod = true;
      }
    }

    isProjectModded() {
      return Cast.toBoolean(loadedMod);
    }

    unLoadMod(util) {
      const targets = runtime.targets;
      for (const target of targets) {
        if (target.isOriginal && !target.isStage) {
          if(target.sprite.name.includes("Mod//")){
            vm.deleteSprite(target.id);
          }
        }
      }
      loadedMod = false;
    }

    isLoadingMod() {
      return isLoading;
    }

    exportMod(args) {
      const mod_JSON = JSON.stringify(this.findMod(args.MOD));
      downloadBlob(
        new Blob([Cast.toString(mod_JSON)]),
        Cast.toString(args.MOD.replaceAll(" ", "_") + args.FILE)
      );
    }
    async importMod(args) {
      let mod_JSON = await readFile(args.FORMAT)
        .then((result) => result)
        .catch((error) => {
          throw new Error("Error during file reading:" + error);
        });

      if (!mod_JSON) {
        console.warn(
          "Mod file selection was canceled or no mod file selected."
        );
        return;
      }

      try {
        mod_JSON = JSON.parse(Cast.toString(mod_JSON));
        mods.push(mod_JSON);
      } catch (error) {
        throw new Error(`Invalid mod file format. Please provide a valid mod file with the "${args.FORMAT}" extension.`)
      }
    }
  }
  // @ts-ignore
  Scratch.extensions.register(new hamturbomodz());
})(Scratch);
