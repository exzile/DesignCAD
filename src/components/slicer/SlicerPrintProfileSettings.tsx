import type { PrintProfile } from '../../types/slicer';
import { Num, Check, Sel, Density, SectionDivider } from './workspace/settings/controls/SettingsFieldControls';
import { SlicerSection } from './SlicerSection';
import { useSlicerVisibilityStore } from '../../store/slicerVisibilityStore';

export function SlicerPrintProfileSettings({
  print,
  upd,
}: {
  print: PrintProfile;
  upd: (updates: Record<string, unknown>) => void;
}) {
  const isVisible = useSlicerVisibilityStore((s) => s.isVisible);
  useSlicerVisibilityStore((s) => s.visible); // re-render on toggle

  return (
    <>
      {isVisible('quality') && <SlicerSection title="Quality" color="#4a9eff" defaultOpen={true}>
        <Num label="Layer Height" unit="mm" value={print.layerHeight} step={0.05} min={0.01} max={1.0} onChange={(v) => upd({ layerHeight: v })} />
        <Num label="First Layer Height" unit="mm" value={print.firstLayerHeight} step={0.05} min={0.05} max={1.0} onChange={(v) => upd({ firstLayerHeight: v })} />
        <SectionDivider label="Line Widths" />
        <Num label="Line Width" unit="mm" value={print.lineWidth ?? 0.4} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ lineWidth: v })} />
        <Num label="Outer Wall Line Width" unit="mm" value={print.outerWallLineWidth ?? 0.4} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ outerWallLineWidth: v })} />
        <Num label="Top/Bottom Line Width" unit="mm" value={print.topBottomLineWidth ?? 0.4} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ topBottomLineWidth: v })} />
        <Num label="Initial Layer Width Factor" unit="%" value={print.initialLayerLineWidthFactor ?? 120} step={5} min={50} max={200} onChange={(v) => upd({ initialLayerLineWidthFactor: v })} />
        <SectionDivider label="Adaptive Layers" />
        <Check label="Enable Adaptive Layers" value={print.adaptiveLayersEnabled ?? false} onChange={(v) => upd({ adaptiveLayersEnabled: v })} />
        {(print.adaptiveLayersEnabled ?? false) && (<>
          <Num label="Max Variation" unit="mm" value={print.adaptiveLayersMaxVariation ?? 0.1} step={0.01} min={0.01} max={0.5} onChange={(v) => upd({ adaptiveLayersMaxVariation: v })} />
          <Num label="Variation Step" unit="mm" value={print.adaptiveLayersVariationStep ?? 0.05} step={0.01} min={0.01} max={0.2} onChange={(v) => upd({ adaptiveLayersVariationStep: v })} />
        </>)}
      </SlicerSection>}

      {isVisible('walls') && <SlicerSection title="Walls" color="#a78bfa" defaultOpen={false}>
        <Num label="Wall Count" value={print.wallCount} min={1} max={20} onChange={(v) => upd({ wallCount: v })} />
        <Num label="Wall Line Width" unit="mm" value={print.wallLineWidth} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ wallLineWidth: v })} />
        <Check label="Outer Wall First" value={print.outerWallFirst ?? false} onChange={(v) => upd({ outerWallFirst: v })} />
        <Check label="Alternate Extra Wall" value={print.alternateExtraWall ?? false} onChange={(v) => upd({ alternateExtraWall: v })} />
        <Sel label="Z Seam Alignment" value={print.zSeamAlignment}
          onChange={(v) => upd({ zSeamAlignment: v })}
          options={[
            { value: 'sharpest_corner', label: 'Sharpest Corner' },
            { value: 'aligned', label: 'Aligned' },
            { value: 'shortest', label: 'Shortest' },
            { value: 'random', label: 'Random' },
          ]} />
        <Check label="Thin Wall Detection" value={print.thinWallDetection} onChange={(v) => upd({ thinWallDetection: v })} />
        <SectionDivider label="Advanced" />
        <Num label="Min Wall Line Width" unit="mm" value={print.minWallLineWidth ?? 0.2} step={0.01} min={0.05} max={1} onChange={(v) => upd({ minWallLineWidth: v })} />
        <Num label="Wall Transition Length" unit="mm" value={print.wallTransitionLength ?? 1.0} step={0.1} min={0.1} max={10} onChange={(v) => upd({ wallTransitionLength: v })} />
        <Num label="Outer Wall Wipe Distance" unit="mm" value={print.outerWallWipeDistance ?? 0} step={0.1} min={0} max={5} onChange={(v) => upd({ outerWallWipeDistance: v })} />
      </SlicerSection>}

      {isVisible('topBottom') && <SlicerSection title="Top / Bottom" color="#2dd4bf" defaultOpen={false}>
        <Num label="Top Layers" value={print.topLayers} min={0} max={50} onChange={(v) => upd({ topLayers: v })} />
        <Num label="Bottom Layers" value={print.bottomLayers} min={0} max={50} onChange={(v) => upd({ bottomLayers: v })} />
        <Sel label="Pattern" value={print.topBottomPattern}
          onChange={(v) => upd({ topBottomPattern: v })}
          options={[
            { value: 'lines', label: 'Lines' },
            { value: 'concentric', label: 'Concentric' },
            { value: 'zigzag', label: 'Zigzag' },
          ]} />
        <Num label="Top Surface Speed" unit="mm/s" value={print.topSpeed} min={1} max={500} onChange={(v) => upd({ topSpeed: v })} />
        <SectionDivider label="Ironing" />
        <Check label="Enable Ironing" value={print.ironingEnabled} onChange={(v) => upd({ ironingEnabled: v })} />
        {print.ironingEnabled && (<>
          <Num label="Ironing Speed" unit="mm/s" value={print.ironingSpeed} min={1} max={100} onChange={(v) => upd({ ironingSpeed: v })} />
          <Num label="Ironing Flow" unit="%" value={print.ironingFlow} step={0.5} min={0} max={30} onChange={(v) => upd({ ironingFlow: v })} />
          <Num label="Ironing Spacing" unit="mm" value={print.ironingSpacing} step={0.01} min={0.01} max={1.0} onChange={(v) => upd({ ironingSpacing: v })} />
        </>)}
      </SlicerSection>}

      {isVisible('infill') && <SlicerSection title="Infill" color="#fb923c" defaultOpen={true}>
        <Density value={print.infillDensity} onChange={(v) => upd({ infillDensity: v })} />
        <Sel label="Pattern" value={print.infillPattern}
          onChange={(v) => upd({ infillPattern: v })}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'lines', label: 'Lines' },
            { value: 'triangles', label: 'Triangles' },
            { value: 'cubic', label: 'Cubic' },
            { value: 'gyroid', label: 'Gyroid' },
            { value: 'honeycomb', label: 'Honeycomb' },
            { value: 'lightning', label: 'Lightning' },
            { value: 'concentric', label: 'Concentric' },
            { value: 'cross', label: 'Cross' },
            { value: 'cross3d', label: 'Cross 3D' },
            { value: 'quarter_cubic', label: 'Quarter Cubic' },
            { value: 'octet', label: 'Octet' },
            { value: 'tri_hexagon', label: 'Tri-Hexagon' },
            { value: 'zigzag', label: 'Zigzag' },
            { value: 'tetrahedral', label: 'Tetrahedral' },
            { value: 'cubicsubdiv', label: 'Cubic Subdivision' },
          ]} />
        <Num label="Infill Line Width" unit="mm" value={print.infillLineWidth} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ infillLineWidth: v })} />
        <Num label="Infill Overlap" unit="%" value={print.infillOverlap} min={0} max={50} onChange={(v) => upd({ infillOverlap: v })} />
      </SlicerSection>}

      {isVisible('speed') && <SlicerSection title="Speed" color="#f43f5e" defaultOpen={false}>
        <Num label="Print Speed" unit="mm/s" value={print.printSpeed} min={1} max={1000} onChange={(v) => upd({ printSpeed: v })} />
        <Num label="Travel Speed" unit="mm/s" value={print.travelSpeed} min={1} max={1000} onChange={(v) => upd({ travelSpeed: v })} />
        <Num label="First Layer Speed" unit="mm/s" value={print.firstLayerSpeed} min={1} max={200} onChange={(v) => upd({ firstLayerSpeed: v })} />
        <SectionDivider label="Per-Feature" />
        <Num label="Outer Wall Speed" unit="mm/s" value={print.outerWallSpeed} min={1} max={500} onChange={(v) => upd({ outerWallSpeed: v })} />
        <Num label="Inner Wall Speed" unit="mm/s" value={print.wallSpeed} min={1} max={500} onChange={(v) => upd({ wallSpeed: v })} />
        <Num label="Infill Speed" unit="mm/s" value={print.infillSpeed} min={1} max={500} onChange={(v) => upd({ infillSpeed: v })} />
        <Num label="Support Speed" unit="mm/s" value={print.supportSpeed ?? 40} min={1} max={500} onChange={(v) => upd({ supportSpeed: v })} />
        <Num label="Small Area Speed" unit="mm/s" value={print.smallAreaSpeed ?? 20} min={1} max={200} onChange={(v) => upd({ smallAreaSpeed: v })} />
      </SlicerSection>}

      {isVisible('travel') && <SlicerSection title="Travel" color="#22d3ee" defaultOpen={false}>
        <Sel label="Combing Mode" value={print.combingMode}
          onChange={(v) => upd({ combingMode: v })}
          options={[
            { value: 'all', label: 'All — avoid everything' },
            { value: 'noskin', label: 'No Skin — avoid skin only' },
            { value: 'infill', label: 'Infill Only' },
            { value: 'off', label: 'Off — shortest path' },
          ]} />
        <Check label="Avoid Crossing Perimeters" value={print.avoidCrossingPerimeters} onChange={(v) => upd({ avoidCrossingPerimeters: v })} />
        <Num label="Min Travel Before Retract" unit="mm" value={print.retractionMinTravel ?? 1.5} step={0.1} min={0} max={20} onChange={(v) => upd({ retractionMinTravel: v })} />
        <Check label="Retract at Layer Change" value={print.retractAtLayerChange ?? true} onChange={(v) => upd({ retractAtLayerChange: v })} />
        <Check label="Retract Before Outer Wall" value={print.travelRetractBeforeOuterWall ?? false} onChange={(v) => upd({ travelRetractBeforeOuterWall: v })} />
        <Check label="Combing Avoids Supports" value={print.combingAvoidsSupports ?? false} onChange={(v) => upd({ combingAvoidsSupports: v })} />
        <SectionDivider label="Retraction Limits" />
        <Num label="Max Retraction Count" value={print.maxRetractionCount ?? 90} min={1} max={300} onChange={(v) => upd({ maxRetractionCount: v })} />
        <Num label="Extra Prime Amount" unit="mm³" value={print.retractionExtraPrimeAmount ?? 0} step={0.01} min={0} max={1} onChange={(v) => upd({ retractionExtraPrimeAmount: v })} />
      </SlicerSection>}

      {isVisible('cooling') && <SlicerSection title="Cooling" color="#60a5fa" defaultOpen={false}>
        <Num label="Min Layer Time" unit="s" value={print.minLayerTime} min={0} max={120} onChange={(v) => upd({ minLayerTime: v })} />
        <Num label="Full Fan Speed at Layer" value={print.fanFullLayer ?? 4} min={1} max={50} onChange={(v) => upd({ fanFullLayer: v })} />
        <Num label="Min Print Speed" unit="mm/s" value={print.minPrintSpeed ?? 10} min={1} max={100} onChange={(v) => upd({ minPrintSpeed: v })} />
        <Check label="Lift Head on Min Layer Time" value={print.liftHeadEnabled ?? false} onChange={(v) => upd({ liftHeadEnabled: v })} />
        <Check label="Bridge Fan" value={print.enableBridgeFan} onChange={(v) => upd({ enableBridgeFan: v })} />
        {print.enableBridgeFan && (
          <Num label="Bridge Fan Speed" unit="%" value={print.bridgeFanSpeed} min={0} max={100} onChange={(v) => upd({ bridgeFanSpeed: v })} />
        )}
        <SectionDivider label="Fan Ramp-up" />
        <Num label="Regular Fan Speed at Layer" value={print.regularFanSpeedLayer ?? 1} min={0} max={100} onChange={(v) => upd({ regularFanSpeedLayer: v })} />
        <Num label="Fan Kickstart Time" unit="ms" value={print.fanKickstartTime ?? 100} step={10} min={0} max={5000} onChange={(v) => upd({ fanKickstartTime: v })} />
      </SlicerSection>}

      {isVisible('support') && <SlicerSection title="Support" color="#facc15" defaultOpen={print.supportEnabled}>
        <Check label="Enable Support" value={print.supportEnabled} onChange={(v) => upd({ supportEnabled: v })} />
        {print.supportEnabled && (<>
          <Sel label="Support Structure" value={print.supportType}
            onChange={(v) => upd({ supportType: v })}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'tree', label: 'Tree' },
              { value: 'organic', label: 'Organic' },
            ]} />
          <Num label="Overhang Angle" unit="°" value={print.supportAngle} min={0} max={89} onChange={(v) => upd({ supportAngle: v })} />
          <Density value={print.supportDensity} onChange={(v) => upd({ supportDensity: v })} />
          <Sel label="Support Pattern" value={print.supportPattern}
            onChange={(v) => upd({ supportPattern: v })}
            options={[
              { value: 'lines', label: 'Lines' },
              { value: 'grid', label: 'Grid' },
              { value: 'zigzag', label: 'Zigzag' },
            ]} />
          <SectionDivider label="Distances" />
          <Num label="Z Distance" unit="mm" value={print.supportZDistance} step={0.05} min={0} max={5} onChange={(v) => upd({ supportZDistance: v })} />
          <Num label="XY Distance" unit="mm" value={print.supportXYDistance} step={0.05} min={0} max={5} onChange={(v) => upd({ supportXYDistance: v })} />
          <SectionDivider label="Interface" />
          <Check label="Support Interface Layers" value={print.supportInterface} onChange={(v) => upd({ supportInterface: v })} />
          {print.supportInterface && (
            <Num label="Interface Layer Count" value={print.supportInterfaceLayers} min={1} max={10} onChange={(v) => upd({ supportInterfaceLayers: v })} />
          )}
          {(print.supportType === 'tree' || print.supportType === 'organic') && (<>
            <SectionDivider label="Tree Support" />
            <Num label="Branch Angle" unit="°" value={print.supportTreeAngle ?? 60} min={10} max={85} onChange={(v) => upd({ supportTreeAngle: v })} />
            <Num label="Branch Diameter" unit="mm" value={print.supportTreeBranchDiameter ?? 5} step={0.5} min={1} max={20} onChange={(v) => upd({ supportTreeBranchDiameter: v })} />
          </>)}
          <SectionDivider label="Placement" />
          <Check label="Build Plate Only" value={print.supportBuildplateOnly ?? false} onChange={(v) => upd({ supportBuildplateOnly: v })} />
          <Num label="Support Wall Count" value={print.supportWallCount ?? 0} min={0} max={5} onChange={(v) => upd({ supportWallCount: v })} />
          <Num label="Bottom Support Distance" unit="mm" value={print.supportBottomDistance ?? 0.2} step={0.05} min={0} max={5} onChange={(v) => upd({ supportBottomDistance: v })} />
          <SectionDivider label="Roof / Floor" />
          <Check label="Support Roof" value={print.supportRoofEnable ?? false} onChange={(v) => upd({ supportRoofEnable: v })} />
          <Check label="Support Floor" value={print.supportFloorEnable ?? false} onChange={(v) => upd({ supportFloorEnable: v })} />
          {((print.supportRoofEnable ?? false) || (print.supportFloorEnable ?? false)) && (<>
            <Sel label="Interface Pattern" value={print.supportInterfacePattern ?? 'lines'}
              onChange={(v) => upd({ supportInterfacePattern: v })}
              options={[
                { value: 'lines', label: 'Lines' },
                { value: 'grid', label: 'Grid' },
                { value: 'concentric', label: 'Concentric' },
                { value: 'zigzag', label: 'Zigzag' },
              ]} />
            <Num label="Interface Density" unit="%" value={print.supportInterfaceDensity ?? 100} min={0} max={100} onChange={(v) => upd({ supportInterfaceDensity: v })} />
          </>)}
        </>)}
      </SlicerSection>}

      {isVisible('adhesion') && <SlicerSection title="Build Plate Adhesion" color="#4ade80" defaultOpen={false}>
        <Sel label="Type" value={print.adhesionType}
          onChange={(v) => upd({ adhesionType: v })}
          options={[
            { value: 'none', label: 'None' },
            { value: 'skirt', label: 'Skirt' },
            { value: 'brim', label: 'Brim' },
            { value: 'raft', label: 'Raft' },
          ]} />
        {print.adhesionType === 'skirt' && (<>
          <Num label="Skirt Lines" value={print.skirtLines} min={1} max={20} onChange={(v) => upd({ skirtLines: v })} />
          <Num label="Skirt Distance" unit="mm" value={print.skirtDistance} step={0.5} min={0} max={20} onChange={(v) => upd({ skirtDistance: v })} />
        </>)}
        {print.adhesionType === 'brim' && (<>
          <Num label="Brim Width" unit="mm" value={print.brimWidth} step={0.5} min={0} max={50} onChange={(v) => upd({ brimWidth: v })} />
          <Num label="Brim Gap" unit="mm" value={print.brimGap ?? 0} step={0.1} min={0} max={5} onChange={(v) => upd({ brimGap: v })} />
          <Sel label="Brim Location" value={print.brimLocation ?? 'outside'}
            onChange={(v) => upd({ brimLocation: v })}
            options={[
              { value: 'outside', label: 'Outside' },
              { value: 'inside', label: 'Inside' },
              { value: 'everywhere', label: 'Everywhere' },
            ]} />
        </>)}
        {print.adhesionType === 'raft' && (<>
          <Num label="Raft Layers" value={print.raftLayers} min={1} max={10} onChange={(v) => upd({ raftLayers: v })} />
          <Num label="Raft Margin" unit="mm" value={print.raftMargin ?? 5} step={0.5} min={0} max={30} onChange={(v) => upd({ raftMargin: v })} />
          <SectionDivider label="Raft Layers (Advanced)" />
          <Num label="Base Thickness" unit="mm" value={print.raftBaseThickness ?? 0.3} step={0.05} min={0.1} max={2} onChange={(v) => upd({ raftBaseThickness: v })} />
          <Num label="Base Line Width" unit="mm" value={print.raftBaseLineWidth ?? 0.8} step={0.05} min={0.1} max={3} onChange={(v) => upd({ raftBaseLineWidth: v })} />
          <Num label="Base Speed" unit="mm/s" value={print.raftBaseSpeed ?? 20} min={1} max={200} onChange={(v) => upd({ raftBaseSpeed: v })} />
          <Num label="Interface Thickness" unit="mm" value={print.raftInterfaceThickness ?? 0.27} step={0.05} min={0.1} max={2} onChange={(v) => upd({ raftInterfaceThickness: v })} />
          <Num label="Surface Air Gap" unit="mm" value={print.raftAirGap ?? 0.3} step={0.05} min={0} max={2} onChange={(v) => upd({ raftAirGap: v })} />
        </>)}
        {print.adhesionType === 'skirt' && (
          <Num label="Skirt Height (layers)" value={print.skirtHeight ?? 1} min={1} max={10} onChange={(v) => upd({ skirtHeight: v })} />
        )}
      </SlicerSection>}

      {isVisible('specialModes') && <SlicerSection title="Special Modes" color="#e879f9" defaultOpen={false}>
        <Check label="Vase Mode (Spiralize Contour)" value={print.spiralizeContour ?? false} onChange={(v) => upd({ spiralizeContour: v })} />
        <Sel label="Surface Mode" value={print.surfaceMode ?? 'normal'}
          onChange={(v) => upd({ surfaceMode: v })}
          options={[
            { value: 'normal', label: 'Normal — solid model' },
            { value: 'surface', label: 'Surface — shell only' },
            { value: 'both', label: 'Both — normal + surface' },
          ]} />
        <Sel label="Print Sequence" value={print.printSequence ?? 'all_at_once'}
          onChange={(v) => upd({ printSequence: v })}
          options={[
            { value: 'all_at_once', label: 'All at Once' },
            { value: 'one_at_a_time', label: 'One at a Time' },
          ]} />
        <SectionDivider label="Mold" />
        <Check label="Enable Mold Mode" value={print.moldEnabled ?? false} onChange={(v) => upd({ moldEnabled: v })} />
        {(print.moldEnabled ?? false) && (<>
          <Num label="Mold Draft Angle" unit="°" value={print.moldAngle ?? 40} min={0} max={89} onChange={(v) => upd({ moldAngle: v })} />
          <Num label="Mold Roof Height" unit="mm" value={print.moldRoofHeight ?? 0.5} step={0.1} min={0} max={10} onChange={(v) => upd({ moldRoofHeight: v })} />
        </>)}
      </SlicerSection>}

      {isVisible('experimental') && <SlicerSection title="Experimental" color="#94a3b8" defaultOpen={false}>
        <Check label="Draft Shield" value={print.draftShieldEnabled ?? false} onChange={(v) => upd({ draftShieldEnabled: v })} />
        {print.draftShieldEnabled && (
          <Num label="Draft Shield Distance" unit="mm" value={print.draftShieldDistance ?? 10} step={1} min={1} max={50} onChange={(v) => upd({ draftShieldDistance: v })} />
        )}
        <Check label="Coasting" value={print.coastingEnabled ?? false} onChange={(v) => upd({ coastingEnabled: v })} />
        {print.coastingEnabled && (
          <Num label="Coasting Volume" unit="mm³" value={print.coastingVolume ?? 0.064} step={0.001} min={0} max={1} onChange={(v) => upd({ coastingVolume: v })} />
        )}
        <SectionDivider label="Fuzzy Skin" />
        <Check label="Enable Fuzzy Skin" value={print.fuzzySkinsEnabled ?? false} onChange={(v) => upd({ fuzzySkinsEnabled: v })} />
        {(print.fuzzySkinsEnabled ?? false) && (<>
          <Num label="Fuzzy Thickness" unit="mm" value={print.fuzzySkinThickness ?? 0.3} step={0.05} min={0.01} max={2} onChange={(v) => upd({ fuzzySkinThickness: v })} />
          <Num label="Fuzzy Point Distance" unit="mm" value={print.fuzzySkinPointDist ?? 0.8} step={0.05} min={0.1} max={5} onChange={(v) => upd({ fuzzySkinPointDist: v })} />
        </>)}
        <SectionDivider label="Overhang" />
        <Check label="Make Overhang Printable" value={print.makeOverhangPrintable ?? false} onChange={(v) => upd({ makeOverhangPrintable: v })} />
        {(print.makeOverhangPrintable ?? false) && (
          <Num label="Max Overhang Angle" unit="°" value={print.makeOverhangPrintableMaxAngle ?? 50} min={0} max={89} onChange={(v) => upd({ makeOverhangPrintableMaxAngle: v })} />
        )}
        <SectionDivider label="Slicing" />
        <Sel label="Slicing Tolerance" value={print.slicingTolerance ?? 'middle'}
          onChange={(v) => upd({ slicingTolerance: v })}
          options={[
            { value: 'middle', label: 'Middle — balanced' },
            { value: 'inclusive', label: 'Inclusive — thicker' },
            { value: 'exclusive', label: 'Exclusive — thinner' },
          ]} />
        <Num label="Min Polygon Circumference" unit="mm" value={print.minimumPolygonCircumference ?? 1.0} step={0.1} min={0.1} max={10} onChange={(v) => upd({ minimumPolygonCircumference: v })} />
        <Num label="Small Hole Max Size" unit="mm" value={print.smallHoleMaxSize ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ smallHoleMaxSize: v })} />
      </SlicerSection>}

      {isVisible('acceleration') && <SlicerSection title="Acceleration & Jerk" color="#fb7185" defaultOpen={false}>
        <Check label="Enable Acceleration Control" value={print.accelerationEnabled ?? false} onChange={(v) => upd({ accelerationEnabled: v })} />
        {(print.accelerationEnabled ?? false) && (<>
          <SectionDivider label="Acceleration (mm/s²)" />
          <Num label="Print" unit="mm/s²" value={print.accelerationPrint ?? 3000} min={100} max={20000} onChange={(v) => upd({ accelerationPrint: v })} />
          <Num label="Travel" unit="mm/s²" value={print.accelerationTravel ?? 3000} min={100} max={20000} onChange={(v) => upd({ accelerationTravel: v })} />
          <Num label="Outer Wall" unit="mm/s²" value={print.accelerationWall ?? 1000} min={100} max={20000} onChange={(v) => upd({ accelerationWall: v })} />
          <Num label="Infill" unit="mm/s²" value={print.accelerationInfill ?? 3000} min={100} max={20000} onChange={(v) => upd({ accelerationInfill: v })} />
          <Num label="Top/Bottom" unit="mm/s²" value={print.accelerationTopBottom ?? 1000} min={100} max={20000} onChange={(v) => upd({ accelerationTopBottom: v })} />
          <Num label="Support" unit="mm/s²" value={print.accelerationSupport ?? 2000} min={100} max={20000} onChange={(v) => upd({ accelerationSupport: v })} />
        </>)}
        <Check label="Enable Jerk Control" value={print.jerkEnabled ?? false} onChange={(v) => upd({ jerkEnabled: v })} />
        {(print.jerkEnabled ?? false) && (<>
          <SectionDivider label="Jerk (mm/s)" />
          <Num label="Print Jerk" unit="mm/s" value={print.jerkPrint ?? 10} min={1} max={30} onChange={(v) => upd({ jerkPrint: v })} />
          <Num label="Travel Jerk" unit="mm/s" value={print.jerkTravel ?? 10} min={1} max={30} onChange={(v) => upd({ jerkTravel: v })} />
          <Num label="Wall Jerk" unit="mm/s" value={print.jerkWall ?? 8} min={1} max={30} onChange={(v) => upd({ jerkWall: v })} />
          <Num label="Infill Jerk" unit="mm/s" value={print.jerkInfill ?? 10} min={1} max={30} onChange={(v) => upd({ jerkInfill: v })} />
          <Num label="Top/Bottom Jerk" unit="mm/s" value={print.jerkTopBottom ?? 8} min={1} max={30} onChange={(v) => upd({ jerkTopBottom: v })} />
        </>)}
      </SlicerSection>}

      {isVisible('meshFixes') && <SlicerSection title="Mesh Fixes" color="#34d399" defaultOpen={false}>
        <Check label="Union Overlapping Volumes" value={print.unionOverlappingVolumes ?? true} onChange={(v) => upd({ unionOverlappingVolumes: v })} />
        <Check label="Remove All Holes" value={print.removeAllHoles ?? false} onChange={(v) => upd({ removeAllHoles: v })} />
        <Check label="Extensive Stitching" value={print.extensiveStitching ?? false} onChange={(v) => upd({ extensiveStitching: v })} />
        <Check label="Keep Disconnected Faces" value={print.keepDisconnectedFaces ?? false} onChange={(v) => upd({ keepDisconnectedFaces: v })} />
        <SectionDivider label="Precision" />
        <Num label="Maximum Resolution" unit="mm" value={print.maxResolution ?? 0.5} step={0.01} min={0.01} max={2} onChange={(v) => upd({ maxResolution: v })} />
        <Num label="Maximum Deviation" unit="mm" value={print.maxDeviation ?? 0.025} step={0.005} min={0.001} max={1} onChange={(v) => upd({ maxDeviation: v })} />
        <Num label="Max Travel Resolution" unit="mm" value={print.maxTravelResolution ?? 0.8} step={0.1} min={0.1} max={5} onChange={(v) => upd({ maxTravelResolution: v })} />
      </SlicerSection>}

      {/* ─── Dimensional Compensation (Cura: Shell) ─────────────────────── */}
      {isVisible('compensation') && <SlicerSection title="Dimensional Compensation" color="#c084fc" defaultOpen={false}>
        <Num label="Horizontal Expansion" unit="mm" value={print.horizontalExpansion ?? 0} step={0.01} min={-1} max={1} onChange={(v) => upd({ horizontalExpansion: v })} />
        <Num label="Initial Layer Horizontal Expansion" unit="mm" value={print.initialLayerHorizontalExpansion ?? 0} step={0.01} min={-1} max={1} onChange={(v) => upd({ initialLayerHorizontalExpansion: v })} />
        <Num label="Hole Horizontal Expansion" unit="mm" value={print.holeHorizontalExpansion ?? 0} step={0.01} min={-1} max={1} onChange={(v) => upd({ holeHorizontalExpansion: v })} />
        <Num label="Elephant Foot Compensation" unit="mm" value={print.elephantFootCompensation ?? 0} step={0.01} min={0} max={1} onChange={(v) => upd({ elephantFootCompensation: v })} />
      </SlicerSection>}

      {/* ─── Per-feature Flow (Cura: Material) ──────────────────────────── */}
      {isVisible('flow') && <SlicerSection title="Flow" color="#f472b6" defaultOpen={false}>
        <Num label="Wall Flow" unit="%" value={print.wallFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ wallFlow: v })} />
        <Num label="Outer Wall Flow" unit="%" value={print.outerWallFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ outerWallFlow: v })} />
        <Num label="Inner Wall Flow" unit="%" value={print.innerWallFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ innerWallFlow: v })} />
        <Num label="Top/Bottom Flow" unit="%" value={print.topBottomFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ topBottomFlow: v })} />
        <Num label="Infill Flow" unit="%" value={print.infillFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ infillFlow: v })} />
        <Num label="Support Flow" unit="%" value={print.supportFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ supportFlow: v })} />
        <Num label="Support Interface Flow" unit="%" value={print.supportInterfaceFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ supportInterfaceFlow: v })} />
        <Num label="Skirt/Brim Flow" unit="%" value={print.skirtBrimFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ skirtBrimFlow: v })} />
        <Num label="Initial Layer Flow" unit="%" value={print.initialLayerFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ initialLayerFlow: v })} />
      </SlicerSection>}

      {/* ─── Advanced Bridging (Cura: Experimental) ─────────────────────── */}
      {isVisible('bridging') && <SlicerSection title="Bridging" color="#38bdf8" defaultOpen={false}>
        <Check label="Enable Advanced Bridge Settings" value={print.enableBridgeSettings ?? false} onChange={(v) => upd({ enableBridgeSettings: v })} />
        {(print.enableBridgeSettings ?? false) && (<>
          <Num label="Bridge Wall Speed" unit="mm/s" value={print.bridgeWallSpeed ?? 30} min={1} max={200} onChange={(v) => upd({ bridgeWallSpeed: v })} />
          <Num label="Bridge Skin Speed" unit="mm/s" value={print.bridgeSkinSpeed ?? 30} min={1} max={200} onChange={(v) => upd({ bridgeSkinSpeed: v })} />
          <Num label="Bridge Skin Flow" unit="%" value={print.bridgeSkinFlow ?? 100} step={1} min={0} max={200} onChange={(v) => upd({ bridgeSkinFlow: v })} />
          <Num label="Bridge Angle (0 = auto)" unit="°" value={print.bridgeAngle ?? 0} min={0} max={359} onChange={(v) => upd({ bridgeAngle: v })} />
          <Num label="Bridge Min Wall Line Width" unit="mm" value={print.bridgeMinWallLineWidth ?? 0.2} step={0.01} min={0.05} max={2} onChange={(v) => upd({ bridgeMinWallLineWidth: v })} />
          <Num label="Bridge Sparse Infill Max Density" unit="%" value={print.bridgeSparseInfillMaxDensity ?? 0} step={1} min={0} max={100} onChange={(v) => upd({ bridgeSparseInfillMaxDensity: v })} />
          <SectionDivider label="Multi-Layer Bridge" />
          <Check label="Apply to Layers Above First Bridge" value={print.bridgeEnableMoreLayers ?? false} onChange={(v) => upd({ bridgeEnableMoreLayers: v })} />
          {(print.bridgeEnableMoreLayers ?? false) && (<>
            <Num label="Fan Speed (Layer 2)" unit="%" value={print.bridgeFanSpeed2 ?? 50} step={1} min={0} max={100} onChange={(v) => upd({ bridgeFanSpeed2: v })} />
            <Num label="Fan Speed (Layer 3)" unit="%" value={print.bridgeFanSpeed3 ?? 25} step={1} min={0} max={100} onChange={(v) => upd({ bridgeFanSpeed3: v })} />
          </>)}
        </>)}
      </SlicerSection>}

      {/* ─── Small Features ─────────────────────────────────────────────── */}
      {isVisible('smallFeatures') && <SlicerSection title="Small Features" color="#fbbf24" defaultOpen={false}>
        <Num label="Small Feature Max Length" unit="mm" value={print.smallFeatureMaxLength ?? 0} step={0.1} min={0} max={20} onChange={(v) => upd({ smallFeatureMaxLength: v })} />
        <Num label="Small Feature Speed" unit="%" value={print.smallFeatureSpeedFactor ?? 50} step={5} min={10} max={100} onChange={(v) => upd({ smallFeatureSpeedFactor: v })} />
        <Num label="Small Feature Speed (Initial Layer)" unit="%" value={print.smallFeatureInitialLayerSpeedFactor ?? 50} step={5} min={10} max={100} onChange={(v) => upd({ smallFeatureInitialLayerSpeedFactor: v })} />
        <Num label="Small Hole Max Size" unit="mm" value={print.smallHoleMaxSize ?? 0} step={0.1} min={0} max={20} onChange={(v) => upd({ smallHoleMaxSize: v })} />
      </SlicerSection>}

      {/* ══════════════════════════════════════════════════════════════════
          Cura-parity expansion — see TaskLists.txt Phase A2.
          Fields marked "storage-only" persist through save/load but
          aren't yet honored by the slicer worker.
          ══════════════════════════════════════════════════════════════════ */}

      {isVisible('wallsAdvanced') && <SlicerSection title="Walls — Advanced" color="#c4b5fd" defaultOpen={false}>
        <Num label="Wall Line Count (alias)" value={print.wallLineCount ?? print.wallCount ?? 2} min={1} max={20} onChange={(v) => upd({ wallLineCount: v, wallCount: v })} />
        <Num label="Inner Wall Line Width" unit="mm" value={print.innerWallLineWidth ?? 0.4} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ innerWallLineWidth: v })} />
        <Check label="Group Outer Walls" value={print.groupOuterWalls ?? false} onChange={(v) => upd({ groupOuterWalls: v })} />
        <Check label="Alternate Wall Directions" value={print.alternateWallDirections ?? false} onChange={(v) => upd({ alternateWallDirections: v })} />
        <Num label="Min Odd Wall Line Width" unit="mm" value={print.minOddWallLineWidth ?? 0.2} step={0.01} min={0.05} max={1} onChange={(v) => upd({ minOddWallLineWidth: v })} />
        <SectionDivider label="Overhanging Walls" />
        <Num label="Overhanging Wall Angle" unit="°" value={print.overhangingWallAngle ?? 45} min={0} max={89} onChange={(v) => upd({ overhangingWallAngle: v })} />
        <Num label="Overhanging Wall Speed" unit="%" value={print.overhangingWallSpeed ?? 100} step={5} min={10} max={100} onChange={(v) => upd({ overhangingWallSpeed: v })} />
        <SectionDivider label="Z Seam" />
        <Sel label="Z Seam Position" value={print.zSeamPosition ?? 'sharpest_corner'}
          onChange={(v) => upd({ zSeamPosition: v })}
          options={[
            { value: 'shortest',         label: 'Shortest' },
            { value: 'sharpest_corner',  label: 'Sharpest Corner' },
            { value: 'random',           label: 'Random' },
            { value: 'user_specified',   label: 'User Specified (X/Y)' },
            { value: 'back',             label: 'Back' },
          ]} />
        <Check label="Z Seam Relative (X/Y relative to model center)" value={print.zSeamRelative ?? false} onChange={(v) => upd({ zSeamRelative: v })} />
        <Check label="Snap Z Seam to Vertex" value={print.zSeamOnVertex ?? false} onChange={(v) => upd({ zSeamOnVertex: v })} />
        <Num label="Z Seam X" unit="mm" value={print.zSeamX ?? 0} step={0.1} min={-1000} max={1000} onChange={(v) => upd({ zSeamX: v })} />
        <Num label="Z Seam Y" unit="mm" value={print.zSeamY ?? 0} step={0.1} min={-1000} max={1000} onChange={(v) => upd({ zSeamY: v })} />
        <Sel label="Seam Corner Preference" value={print.seamCornerPreference ?? 'none'}
          onChange={(v) => upd({ seamCornerPreference: v })}
          options={[
            { value: 'none',           label: 'None' },
            { value: 'hide_seam',      label: 'Hide Seam' },
            { value: 'expose_seam',    label: 'Expose Seam' },
            { value: 'hide_or_expose', label: 'Hide or Expose' },
            { value: 'smart_hide',     label: 'Smart Hide' },
          ]} />
      </SlicerSection>}

      {isVisible('topBottomAdvanced') && <SlicerSection title="Top/Bottom — Advanced" color="#5eead4" defaultOpen={false}>
        <Num label="Top Thickness" unit="mm" value={print.topThickness ?? 0.8} step={0.05} min={0} max={10} onChange={(v) => upd({ topThickness: v })} />
        <Num label="Bottom Thickness" unit="mm" value={print.bottomThickness ?? 0.8} step={0.05} min={0} max={10} onChange={(v) => upd({ bottomThickness: v })} />
        <Num label="Skin Overlap" unit="%" value={print.skinOverlapPercent ?? 10} step={1} min={0} max={100} onChange={(v) => upd({ skinOverlapPercent: v })} />
        <Num label="Top Skin Expand Distance" unit="mm" value={print.topSkinExpandDistance ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ topSkinExpandDistance: v })} />
        <Num label="Bottom Skin Expand Distance" unit="mm" value={print.bottomSkinExpandDistance ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ bottomSkinExpandDistance: v })} />
        <Num label="Skin Removal Width" unit="mm" value={print.skinRemovalWidth ?? 0} step={0.05} min={0} max={5} onChange={(v) => upd({ skinRemovalWidth: v })} />
        <Num label="Extra Skin Wall Count" value={print.extraSkinWallCount ?? 0} min={0} max={10} onChange={(v) => upd({ extraSkinWallCount: v })} />
        <Check label="No Skin in Z Gaps" value={print.noSkinInZGaps ?? false} onChange={(v) => upd({ noSkinInZGaps: v })} />
        <Sel label="Bottom Pattern (Initial Layer)" value={print.bottomPatternInitialLayer ?? 'lines'}
          onChange={(v) => upd({ bottomPatternInitialLayer: v })}
          options={[
            { value: 'lines',      label: 'Lines' },
            { value: 'concentric', label: 'Concentric' },
            { value: 'zigzag',     label: 'Zigzag' },
            { value: 'monotonic',  label: 'Monotonic' },
          ]} />
        <Check label="Iron Only Highest Layer" value={print.ironOnlyHighestLayer ?? false} onChange={(v) => upd({ ironOnlyHighestLayer: v })} />
      </SlicerSection>}

      {isVisible('infillAdvanced') && <SlicerSection title="Infill — Advanced" color="#fdba74" defaultOpen={false}>
        <Num label="Infill Line Distance (overrides density)" unit="mm" value={print.infillLineDistance ?? 0} step={0.05} min={0} max={20} onChange={(v) => upd({ infillLineDistance: v })} />
        <Num label="Infill Layer Thickness" unit="mm" value={print.infillLayerThickness ?? 0} step={0.05} min={0} max={2} onChange={(v) => upd({ infillLayerThickness: v })} />
        <Check label="Connect Infill Lines" value={print.connectInfillLines ?? false} onChange={(v) => upd({ connectInfillLines: v })} />
        <Check label="Connect Infill Polygons" value={print.connectInfillPolygons ?? true} onChange={(v) => upd({ connectInfillPolygons: v })} />
        <Num label="Infill Wipe Distance" unit="mm" value={print.infillWipeDistance ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ infillWipeDistance: v })} />
        <Num label="Infill Overhang Angle" unit="°" value={print.infillOverhangAngle ?? 0} min={0} max={89} onChange={(v) => upd({ infillOverhangAngle: v })} />
        <Num label="Gradual Infill Step Height" unit="mm" value={print.gradualInfillStepHeight ?? 1.5} step={0.1} min={0.1} max={20} onChange={(v) => upd({ gradualInfillStepHeight: v })} />
        <Num label="Infill X Offset" unit="mm" value={print.infillXOffset ?? 0} step={0.1} min={-100} max={100} onChange={(v) => upd({ infillXOffset: v })} />
        <Num label="Infill Y Offset" unit="mm" value={print.infillYOffset ?? 0} step={0.1} min={-100} max={100} onChange={(v) => upd({ infillYOffset: v })} />
        <SectionDivider label="Lightning Infill" />
        <Num label="Lightning Prune Angle" unit="°" value={print.lightningPruneAngle ?? 40} min={0} max={89} onChange={(v) => upd({ lightningPruneAngle: v })} />
        <Num label="Lightning Straightening Angle" unit="°" value={print.lightningStraighteningAngle ?? 40} min={0} max={89} onChange={(v) => upd({ lightningStraighteningAngle: v })} />
      </SlicerSection>}

      {isVisible('zhop') && <SlicerSection title="Z-Hop & Retraction Extras" color="#93c5fd" defaultOpen={false}>
        <Check label="Z-Hop When Retracted" value={print.zHopWhenRetracted ?? false} onChange={(v) => upd({ zHopWhenRetracted: v })} />
        {(print.zHopWhenRetracted ?? false) && (<>
          <Num label="Z-Hop Height" unit="mm" value={print.zHopHeight ?? 0.4} step={0.05} min={0.05} max={5} onChange={(v) => upd({ zHopHeight: v })} />
          <Num label="Z-Hop Speed" unit="mm/s" value={print.zHopSpeed ?? 10} step={1} min={1} max={100} onChange={(v) => upd({ zHopSpeed: v })} />
          <Check label="Z-Hop Only Over Printed Parts" value={print.zHopOnlyOverPrinted ?? false} onChange={(v) => upd({ zHopOnlyOverPrinted: v })} />
        </>)}
        <SectionDivider label="Prime / Wipe" />
        <Num label="Retraction Extra Prime Amount" unit="mm³" value={print.retractionExtraPrimeAmount ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ retractionExtraPrimeAmount: v })} />
        <Num label="Wipe Retraction Distance" unit="mm" value={print.wipeRetractionDistance ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ wipeRetractionDistance: v })} />
        <Num label="Wipe Retraction Extra Prime" unit="mm³" value={print.wipeRetractionExtraPrime ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ wipeRetractionExtraPrime: v })} />
      </SlicerSection>}

      {isVisible('coolingAdvanced') && <SlicerSection title="Cooling — Advanced" color="#7dd3fc" defaultOpen={false}>
        <Num label="Initial Fan Speed" unit="%" value={print.initialFanSpeed ?? 0} step={1} min={0} max={100} onChange={(v) => upd({ initialFanSpeed: v })} />
        <Num label="Maximum Fan Speed" unit="%" value={print.maximumFanSpeed ?? 100} step={1} min={0} max={100} onChange={(v) => upd({ maximumFanSpeed: v })} />
        <Num label="Regular/Max Fan Threshold" unit="s" value={print.regularMaxFanThreshold ?? 10} step={0.5} min={0} max={60} onChange={(v) => upd({ regularMaxFanThreshold: v })} />
        <Num label="Minimum Speed" unit="mm/s" value={print.minimumSpeed ?? 10} step={1} min={1} max={100} onChange={(v) => upd({ minimumSpeed: v })} />
        <Num label="Build Volume Fan Speed" unit="%" value={print.buildVolumeFanSpeed ?? 0} step={1} min={0} max={100} onChange={(v) => upd({ buildVolumeFanSpeed: v })} />
      </SlicerSection>}

      {isVisible('supportAdvanced') && <SlicerSection title="Support — Advanced" color="#fde68a" defaultOpen={false}>
        <Num label="Support Horizontal Expansion" unit="mm" value={print.supportHorizontalExpansion ?? 0} step={0.1} min={-5} max={5} onChange={(v) => upd({ supportHorizontalExpansion: v })} />
        <Num label="Support Line Distance" unit="mm" value={print.supportLineDistance ?? 0} step={0.1} min={0} max={20} onChange={(v) => upd({ supportLineDistance: v })} />
        <Num label="Support Join Distance" unit="mm" value={print.supportJoinDistance ?? 2} step={0.1} min={0} max={20} onChange={(v) => upd({ supportJoinDistance: v })} />
        <Num label="Minimum Support Area" unit="mm²" value={print.minimumSupportArea ?? 0} step={0.5} min={0} max={100} onChange={(v) => upd({ minimumSupportArea: v })} />
        <Num label="Support Infill Layer Thickness" unit="mm" value={print.supportInfillLayerThickness ?? 0} step={0.05} min={0} max={2} onChange={(v) => upd({ supportInfillLayerThickness: v })} />
        <SectionDivider label="Connect / Chain" />
        <Check label="Connect Support Lines" value={print.connectSupportLines ?? false} onChange={(v) => upd({ connectSupportLines: v })} />
        <Check label="Connect Support ZigZags" value={print.connectSupportZigZags ?? false} onChange={(v) => upd({ connectSupportZigZags: v })} />
        <SectionDivider label="Conical Support" />
        <Check label="Enable Conical Support" value={print.enableConicalSupport ?? false} onChange={(v) => upd({ enableConicalSupport: v })} />
        {(print.enableConicalSupport ?? false) && (
          <Num label="Conical Support Angle" unit="°" value={print.conicalSupportAngle ?? 30} min={0} max={60} onChange={(v) => upd({ conicalSupportAngle: v })} />
        )}
        <SectionDivider label="Support Brim" />
        <Check label="Enable Support Brim" value={print.enableSupportBrim ?? false} onChange={(v) => upd({ enableSupportBrim: v })} />
        {(print.enableSupportBrim ?? false) && (<>
          <Num label="Support Brim Line Count" value={print.supportBrimLineCount ?? 5} min={0} max={50} onChange={(v) => upd({ supportBrimLineCount: v })} />
          <Num label="Support Brim Width" unit="mm" value={print.supportBrimWidth ?? 3} step={0.1} min={0} max={50} onChange={(v) => upd({ supportBrimWidth: v })} />
        </>)}
        <SectionDivider label="Stair Step Base" />
        <Num label="Stair Step Height" unit="mm" value={print.supportStairStepHeight ?? 0.3} step={0.05} min={0} max={10} onChange={(v) => upd({ supportStairStepHeight: v })} />
        <Num label="Stair Step Minimum Slope" unit="°" value={print.supportStairStepMinSlope ?? 10} min={0} max={89} onChange={(v) => upd({ supportStairStepMinSlope: v })} />
      </SlicerSection>}

      {isVisible('travelAdvanced') && <SlicerSection title="Travel — Advanced" color="#67e8f9" defaultOpen={false}>
        <Check label="Avoid Printed Parts When Traveling" value={print.avoidPrintedParts ?? false} onChange={(v) => upd({ avoidPrintedParts: v })} />
        <Check label="Avoid Supports When Traveling" value={print.avoidSupports ?? false} onChange={(v) => upd({ avoidSupports: v })} />
        <Num label="Max Comb Distance w/o Retract" unit="mm" value={print.maxCombDistanceNoRetract ?? 0} step={1} min={0} max={1000} onChange={(v) => upd({ maxCombDistanceNoRetract: v })} />
        <Num label="Travel Avoid Distance" unit="mm" value={print.travelAvoidDistance ?? 0.625} step={0.05} min={0} max={10} onChange={(v) => upd({ travelAvoidDistance: v })} />
        <Num label="Inside Travel Avoid Distance" unit="mm" value={print.insideTravelAvoidDistance ?? 0.4} step={0.05} min={0} max={10} onChange={(v) => upd({ insideTravelAvoidDistance: v })} />
      </SlicerSection>}

      {isVisible('experimentalExtra') && <SlicerSection title="Experimental (Cura)" color="#cbd5e1" defaultOpen={false}>
        <SectionDivider label="Fluid Motion" />
        <Check label="Enable Fluid Motion" value={print.fluidMotionEnable ?? false} onChange={(v) => upd({ fluidMotionEnable: v })} />
        {(print.fluidMotionEnable ?? false) && (<>
          <Num label="Fluid Motion Angle" unit="°" value={print.fluidMotionAngle ?? 15} min={0} max={89} onChange={(v) => upd({ fluidMotionAngle: v })} />
          <Num label="Fluid Motion Small Distance" unit="mm" value={print.fluidMotionSmallDistance ?? 0.01} step={0.005} min={0.001} max={1} onChange={(v) => upd({ fluidMotionSmallDistance: v })} />
        </>)}
        <SectionDivider label="Coasting" />
        <Num label="Coasting Speed" unit="%" value={print.coastingSpeed ?? 90} step={1} min={10} max={100} onChange={(v) => upd({ coastingSpeed: v })} />
        <SectionDivider label="Scarf Seam" />
        <Num label="Scarf Seam Length" unit="mm" value={print.scarfSeamLength ?? 0} step={0.1} min={0} max={10} onChange={(v) => upd({ scarfSeamLength: v })} />
        <Num label="Scarf Seam Step Length" unit="mm" value={print.scarfSeamStepLength ?? 0.5} step={0.05} min={0.05} max={5} onChange={(v) => upd({ scarfSeamStepLength: v })} />
        <Num label="Scarf Seam Start Height" unit="mm" value={print.scarfSeamStartHeight ?? 0} step={0.05} min={0} max={10} onChange={(v) => upd({ scarfSeamStartHeight: v })} />
        <SectionDivider label="Ooze Shield" />
        <Check label="Enable Ooze Shield" value={print.enableOozeShield ?? false} onChange={(v) => upd({ enableOozeShield: v })} />
        {(print.enableOozeShield ?? false) && (<>
          <Num label="Ooze Shield Angle" unit="°" value={print.oozeShieldAngle ?? 60} min={0} max={89} onChange={(v) => upd({ oozeShieldAngle: v })} />
          <Num label="Ooze Shield Distance" unit="mm" value={print.oozeShieldDistance ?? 2} step={0.1} min={0} max={20} onChange={(v) => upd({ oozeShieldDistance: v })} />
        </>)}
      </SlicerSection>}

      {isVisible('raftAdvanced') && <SlicerSection title="Raft — Advanced" color="#86efac" defaultOpen={false}>
        <Num label="Raft Wall Count" value={print.raftWallCount ?? 0} min={0} max={10} onChange={(v) => upd({ raftWallCount: v })} />
        <Num label="Raft Smoothing" unit="mm" value={print.raftSmoothing ?? 5} step={0.5} min={0} max={50} onChange={(v) => upd({ raftSmoothing: v })} />
        <Num label="Raft Extra Margin" unit="mm" value={print.raftExtraMargin ?? 15} step={0.5} min={0} max={50} onChange={(v) => upd({ raftExtraMargin: v })} />
        <SectionDivider label="Middle Layers" />
        <Num label="Middle Layer Count" value={print.raftMiddleLayers ?? 2} min={0} max={20} onChange={(v) => upd({ raftMiddleLayers: v })} />
        <Num label="Middle Layer Thickness" unit="mm" value={print.raftMiddleThickness ?? 0.15} step={0.01} min={0.05} max={2} onChange={(v) => upd({ raftMiddleThickness: v })} />
        <Num label="Middle Layer Line Width" unit="mm" value={print.raftMiddleLineWidth ?? 0.4} step={0.01} min={0.1} max={2.0} onChange={(v) => upd({ raftMiddleLineWidth: v })} />
        <SectionDivider label="Top Layers" />
        <Num label="Top Layer Count" value={print.raftTopLayers ?? 2} min={0} max={20} onChange={(v) => upd({ raftTopLayers: v })} />
      </SlicerSection>}

      {/* ─── Prime Tower (Multi-Extruder) ───────────────────────────────── */}
      {isVisible('primeTower') && <SlicerSection title="Prime Tower" color="#a3e635" defaultOpen={false}>
        <Check label="Enable Prime Tower" value={print.primeTowerEnable ?? false} onChange={(v) => upd({ primeTowerEnable: v })} />
        {(print.primeTowerEnable ?? false) && (<>
          <Num label="Tower Size" unit="mm" value={print.primeTowerSize ?? 20} step={1} min={5} max={60} onChange={(v) => upd({ primeTowerSize: v })} />
          <Num label="Position X" unit="mm" value={print.primeTowerPositionX ?? 200} step={1} min={0} max={500} onChange={(v) => upd({ primeTowerPositionX: v })} />
          <Num label="Position Y" unit="mm" value={print.primeTowerPositionY ?? 200} step={1} min={0} max={500} onChange={(v) => upd({ primeTowerPositionY: v })} />
          <Num label="Min Volume per Change" unit="mm³" value={print.primeTowerMinVolume ?? 6} step={0.5} min={0} max={50} onChange={(v) => upd({ primeTowerMinVolume: v })} />
          <Check label="Wipe on Tower" value={print.primeTowerWipeEnable ?? true} onChange={(v) => upd({ primeTowerWipeEnable: v })} />
        </>)}
      </SlicerSection>}
    </>
  );
}
