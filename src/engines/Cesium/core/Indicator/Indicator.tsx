/// <reference types="vite-plugin-svgr/client" />
import useTransition from "@rot1024/use-transition";
import { BoundingSphere, Cartesian3, SceneTransforms, Cartesian2, JulianDate } from "cesium";
import { useEffect, useState } from "react";
import { useCesium } from "resium";

import type { SceneProperty } from "../../..";
import { TimelineManagerRef } from "../../../../Map/useTimelineManager";
import { useIcon } from "../../common";

import Crosshair from "./crosshair.svg?react";

export type Props = {
  className?: string;
  property?: SceneProperty;
  timelineManagerRef?: TimelineManagerRef;
};

export default function Indicator({
  className,
  property,
  timelineManagerRef,
}: Props): JSX.Element | null {
  const { viewer } = useCesium();
  const [isVisible, setIsVisible] = useState(true);
  const [pos, setPos] = useState<Cartesian2>();

  const transition = useTransition(!!pos && isVisible, 500, {
    mountOnEnter: true,
    unmountOnExit: true,
  });
  const { indicator_type, indicator_image, indicator_image_scale } = property?.indicator ?? {};
  const [img, w, h] = useIcon({ image: indicator_image, imageSize: indicator_image_scale });

  useEffect(() => {
    !(!indicator_type || indicator_type === "default")
      ? viewer?.selectionIndicator.viewModel.selectionIndicatorElement.setAttribute(
          "hidden",
          "true",
        )
      : viewer?.selectionIndicator.viewModel.selectionIndicatorElement.removeAttribute("hidden");
  }, [indicator_type, viewer, viewer?.selectionIndicator]);

  useEffect(() => {
    if (!viewer) return;
    const handleTick = () => {
      if (viewer.isDestroyed()) return;
      const selected = viewer.selectedEntity;
      const currentTime = timelineManagerRef?.current?.timeline?.current
        ? JulianDate.fromDate(timelineManagerRef?.current?.timeline.current)
        : undefined;
      if (
        !selected?.isShowing ||
        (currentTime && !selected.isAvailable(currentTime)) ||
        !selected.position
      ) {
        setIsVisible(false);
        return;
      }

      // https://github.com/CesiumGS/cesium/blob/1.94/Source/Widgets/Viewer/Viewer.js#L1839
      let position: Cartesian3 | undefined = undefined;
      const boundingSphere = new BoundingSphere();
      const state = (viewer.dataSourceDisplay as any).getBoundingSphere(
        selected,
        true,
        boundingSphere,
      );
      // https://github.com/CesiumGS/cesium/blob/main/Source/DataSources/BoundingSphereState.js#L24
      if (state !== 2 /* BoundingSphereState.FAILED */) {
        position = boundingSphere.center;
      } else if (selected.position && currentTime) {
        position = selected.position.getValue(currentTime, position);
      }

      if (position) {
        const pos = SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);
        setPos(pos);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const timelineManager = timelineManagerRef?.current;
    timelineManager?.onTick(handleTick);
    return () => {
      timelineManager?.offTick(handleTick);
    };
  }, [viewer, timelineManagerRef]);

  return transition !== "unmounted" && pos ? (
    indicator_type === "crosshair" ? (
      <div
        className={className}
        style={{
          width: 48,
          height: 48,
          fontSize: 0,
          display: "inline-block",
          transitionProperty: "color, background",
          left: pos.x + "px",
          top: pos.y + "px",
          position: "absolute",
          transform: "translate(-50%, -50%)",
          transition: transition === "entering" || transition === "exiting" ? "all 0.5s ease" : "",
          opacity: transition === "entering" || transition === "entered" ? 1 : 0,
          pointerEvents: "none",
        }}>
        <Crosshair />
      </div>
    ) : indicator_type === "custom" ? (
      <img
        src={img}
        width={w}
        height={h}
        style={{
          left: pos.x + "px",
          top: pos.y + "px",
          position: "absolute",
          transform: "translate(-50%, -50%)",
          transition: transition === "entering" || transition === "exiting" ? "all 0.5s ease" : "",
          opacity: transition === "entering" || transition === "entered" ? 1 : 0,
          pointerEvents: "none",
        }}
      />
    ) : (
      <div
        style={{
          left: pos.x + "px",
          top: pos.y + "px",
          position: "absolute",
          transform: "translate(-50%, -50%)",
          transition: transition === "entering" || transition === "exiting" ? "all 0.5s ease" : "",
          opacity: transition === "entering" || transition === "entered" ? 1 : 0,
          pointerEvents: "none",
        }}
      />
    )
  ) : null;
}
