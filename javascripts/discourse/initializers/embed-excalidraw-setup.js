import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "embed-excalidraw",

  initialize() {
    withPluginApi("0.11.1", (api) => {
      api.decorateCookedElement(
        (element, postDecorator) => {
          const draw = element.querySelector(".d-wrap[data-wrap=excalidraw]");
          if (!draw || !postDecorator) {
            return;
          }

          const postModel = postDecorator.getModel();
          if (!postModel) {
            return;
          }

          const scene = draw.innerText.trim();

          draw.innerText = "";

          const component = api.container.owner
            .factoryFor("component:excalidraw-container")
            .create({
              scene,
              postModel,
            });
          component.renderer.appendTo(component, draw);
        },
        {
          onlyStream: true,
          id: "embed-excalidraw",
        }
      );
    });
  },
};
