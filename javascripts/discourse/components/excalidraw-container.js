import { action } from "@ember/object";
import loadScript from "discourse/lib/load-script";
import { ajax } from "discourse/lib/ajax";
import Component from "@ember/component";
import { schedule } from "@ember/runloop";

export default Component.extend({
  tagName: "",
  layoutName: "components/excalidraw-container",
  postModel: null,
  isEditing: false,
  isLoadingReact: false,
  isSavingScene: false,
  scene: null,
  viewModeEnabled: true,
  _ref: null,

  didInsertElement() {
    this._super(...arguments);

    this.set("isLoadingReact", true);

    loadScript(
      "https://unpkg.com/react@17.0.2/umd/react.production.min.js"
    ).then(() => {
      return loadScript(
        "https://unpkg.com/react-dom@17.0.2/umd/react-dom.production.min.js"
      ).then(() => {
        return loadScript(
          "https://unpkg.com/@excalidraw/excalidraw@0.6.0/dist/excalidraw.production.min.js"
        )
          .then(() => {
            this.set("_ref", React.createRef());

            this._renderExcalidraw();
          })
          .finally(() => {
            this.set("isLoadingReact", false);
          });
      });
    });
  },

  _renderExcalidraw() {
    schedule("afterRender", () => {
      if (!this.postModel) {
        return;
      }

      const excalidrawCanvasContainer = document.querySelector(
        `article[data-post-id="${
          this.postModel.id
        }"] .excalidraw-canvas-container`
      );

      if (excalidrawCanvasContainer) {
        const excalidrawComponent = React.createElement(Excalidraw.default, {
          ref: this._ref,
          initialData: JSON.parse(
            this.scene
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"')
          ),
          isCollaborating: false,
          viewModeEnabled: !this.isEditing,
          UIOptions: {
            canvasActions: {
              saveScene: true,
              saveAsScene: true
            }
          }
        });

        ReactDOM.render(excalidrawComponent, excalidrawCanvasContainer);
      }
    });
  },

  @action
  onEdit() {
    this.set("isEditing", true);

    this._renderExcalidraw();
  },

  @action
  onSave() {
    this.set("isSavingScene", true);

    return ajax(`/posts/${this.postModel.id}`, {
      type: "GET",
      cache: false
    }).then(result => {
      const newRaw = result.raw.replace(
        /\[wrap=excalidraw\]\n```\n(.*)\n```\n\[\/wrap\]/gs,
        (match, ignored, off) => {
          const pick = (obj, ...args) => ({
            ...args.reduce((res, key) => ({ ...res, [key]: obj[key] }), {})
          });

          return (
            "[wrap=excalidraw]\n```\n" +
            JSON.stringify(
              {
                elements: this._ref.current.getSceneElements(),
                appState: Object.assign(
                  {},
                  pick(
                    this._ref.current.getAppState(),
                    "theme",
                    "viewBackgroundColor",
                    "currentChartType",
                    "currentItemBackgroundColor",
                    "currentItemEndArrowhead",
                    "currentItemFillStyle",
                    "currentItemFontFamily",
                    "currentItemFontSize",
                    "currentItemLinearStrokeSharpness",
                    "currentItemOpacity",
                    "currentItemRoughness",
                    "currentItemStartArrowhead",
                    "currentItemStrokeColor",
                    "currentItemStrokeSharpness",
                    "currentItemStrokeStyle",
                    "currentItemStrokeWidth",
                    "currentItemTextAlign",
                    "zoom",
                    "offsetLeft",
                    "offsetTop",
                    "scrollX",
                    "scrollY"
                  ),
                  { viewModeEnabled: true }
                )
              },
              null,
              2
            ) +
            "\n```\n[/wrap]"
          );
        }
      );

      const save = this.postModel.save({
        raw: newRaw,
        edit_reason: I18n.t(themePrefix("excalidraw.edit_reason"))
      });

      if (save && save.then) {
        save.finally(() => this.set("isSavingScene", false));
      } else {
        this.set("isSavingScene", false);
      }
    });
  }
});
