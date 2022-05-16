from mlflow.entities._mlflow_object import _MLflowObject
from mlflow.protos.service_pb2 import Metric as ProtoMetric, MetricHistory as ProtoMetricHistory


class Metric(_MLflowObject):
    """
    Metric object.
    """

    def __init__(self, key, value, timestamp, step):
        self._key = key
        self._value = value
        self._timestamp = timestamp
        self._step = step

    @property
    def key(self):
        """String key corresponding to the metric name."""
        return self._key

    @property
    def value(self):
        """Float value of the metric."""
        return self._value

    @property
    def timestamp(self):
        """Metric timestamp as an integer (milliseconds since the Unix epoch)."""
        return self._timestamp

    @property
    def step(self):
        """Integer metric step (x-coordinate)."""
        return self._step

    def to_proto(self):
        metric = ProtoMetric()
        metric.key = self.key
        metric.value = self.value
        metric.timestamp = self.timestamp
        metric.step = self.step
        return metric

    @classmethod
    def from_proto(cls, proto):
        return cls(proto.key, proto.value, proto.timestamp, proto.step)

    def __eq__(self, __o):
        if isinstance(__o, self.__class__):
            return self.__dict__ == __o.__dict__

        return False

    def __hash__(self):
        return hash((self._key, self._value, self._timestamp, self._step))


class MetricHistory(_MLflowObject):
    """
    Metric history for single run and metric key
    """

    def __init__(self, run_id, metric_key, metrics):
        self._run_id = run_id
        self._metric_key = metric_key
        self._metrics = metrics

    @property
    def run_id(self):
        """Identifier of the run for these metrics"""
        return self._run_id

    @property
    def metric_key(self):
        """String key corresponding to the metric name."""
        return self._metric_key

    @property
    def metrics(self):
        """List of metric values"""
        return self._metrics

    @classmethod
    def from_proto(cls, proto):
        metric_history = cls(
            proto.run_id, proto.metric_key, []
        )
        for proto_metric in proto.metrics:
            metric_history._metrics.append(Metric.from_proto(proto_metric))
        return metric_history

    def to_proto(self):
        history = ProtoMetricHistory()
        history.run_id = self.run_id
        history.metric_key = self.metric_key
        history.metrics.extend(metric.to_proto() for metric in self._metrics)
        return history
