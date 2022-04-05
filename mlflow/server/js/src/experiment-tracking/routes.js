import { X_AXIS_RELATIVE } from './components/MetricsPlotControls';

class Routes {
  static rootRoute = '/';

  static getExperimentPageRoute(experimentId) {
    return `/experiments/${experimentId}`;
  }

  static experimentPageRoute = '/experiments/:experimentId';

  static experimentPageSearchRoute = '/experiments/:experimentId/:searchString';

  static getRunPageRoute(experimentId, runUuid) {
    return `/experiments/${experimentId}/runs/${runUuid}`;
  }

  static runPageRoute = '/experiments/:experimentId/runs/:runUuid';

  static runPageWithArtifactSelectedRoute =
    '/experiments/:experimentId/runs/:runUuid/artifactPath/:initialSelectedArtifactPath+';

  /**
   * Get route to the metric plot page
   * @param runUuids - Array of string run IDs to plot
   * @param metricKey - Primary metric key in plot, shown in page breadcrumb
   * @param experimentId - ID of experiment to link to from page breadcrumb
   * @param plots - List of objects per plot, where each object has the following properties:
   *   - key - Identifies the plot
   *   - plotMetricKeys - Array of string metric keys to plot
   *   - plotLayout - Object containing plot layout information in Plotly format. See
   *     https://plot.ly/javascript/plotlyjs-events/#update-data for an idea of object structure
   *   - selectedXAxis - Enum (string) describing type of X axis (wall time, relative time, step)
   *   - yAxisLogScale - Boolean - if true, y axis should be displayed on a log scale
   *     (y axis scale is assumed to be linear otherwise)
   *   - lineSmoothness - Float, coefficient >= 0 describing how much line smoothing to apply
   *   - showPoint - Boolean, whether or not to show dots at individual data points in the metric
   *     line plot
   *   - deselectedCurves - Array of strings where each string describes a curve that was
   *     deselected / toggled off by the user (a curve that should not be displayed in the metric
   *     plot). Strings are of the form "<runId>-<metricKey>". We describe the plot in terms
   *     of deselected curves as we don't know a-priori which runs from
   *     runUuids contain which of the metric keys in plotMetricKeys
   *   - lastLinearYAxisRange - Array containing most recent bounds of a linear-scale y axis.
   *     Used to keep track of the most-recent linear y-axis plot range, to handle the specific
   *     case where we toggle a plot with negative y-axis bounds from linear to log scale,
   *     and then back to linear scale (we save the initial negative linear y-axis bounds so
   *     that we can restore them when converting from log back to linear scale)
   * @returns {string}
   */
  static getMetricPageRoute(runUuids, metricKey, experimentId, plots = null) {
    let route =
      `/metric/${encodeURIComponent(metricKey)}?runs=${JSON.stringify(runUuids)}&` +
      `experiment=${experimentId}`;
    const finalPlots = plots || [{ key: 0 }];
    const plotKeys = finalPlots.map((plot) => plot.key);
    route += `&plot_keys=${JSON.stringify(plotKeys)}`;
    finalPlots.forEach((plot) => {
      // If runs to display are specified (e.g. if user filtered to specific runs in a metric
      // comparison plot), embed them in the URL, otherwise default to metricKey
      const prefix = 'plot_' + plot.key.toString();
      const plotMetricKeys = plot.selectedMetricKeys || [metricKey];
      const plotLayout = plot.layout || {};
      const selectedXAxis = plot.selectedXAxis || X_AXIS_RELATIVE;
      const lineSmoothness = plot.lineSmoothness || 1;
      const showPoint = plot.showPoint || false;
      const deselectedCurves = plot.deselectedCurves || [];
      const lastLinearYAxisRange = plot.lastLinearYAxisRange || [];
      // Convert boolean to enum to keep URL format extensible to adding new types of y axis scales
      const yAxisScale = plot.yAxisLogScale ? 'log' : 'linear';
      route +=
        `&${prefix}_metric_keys=${JSON.stringify(plotMetricKeys)}` +
        `&${prefix}_layout=${JSON.stringify(plotLayout)}` +
        `&${prefix}_x_axis=${selectedXAxis}` +
        `&${prefix}_y_axis_scale=${yAxisScale}` +
        `&${prefix}_line_smoothness=${lineSmoothness}` +
        `&${prefix}_show_point=${showPoint}` +
        `&${prefix}_deselected_curves=${JSON.stringify(deselectedCurves)}` +
        `&${prefix}_last_linear_y_axis_range=${JSON.stringify(lastLinearYAxisRange)}`;
    });
    return route;
  }

  static metricPageRoute = '/metric/:metricKey';

  static getCompareRunPageRoute(runUuids, experimentId) {
    return `/compare-runs?runs=${JSON.stringify(runUuids)}&experiment=${experimentId}`;
  }

  static compareRunPageRoute = '/compare-runs';
}

export default Routes;
