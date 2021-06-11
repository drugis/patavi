(ns patavi.worker.main
  (:gen-class)
  (:require [clojure.string :refer [split]]
            [clojure.tools.cli :refer [cli]]
            [clojure.tools.logging :as log]
            [patavi.worker.amqp :as amqp]
            [patavi.worker.pirate.core :as pirate]))

(def ^:private script-file (atom nil))

(defn -main
  [& args]
  (let [[options args banner]
        (cli args
             ["-h" "--help" "Show help" :default false :flag true]
             ["-r" "--rserve" "Start RServe from application" :default false :flag true]
             ["-n" "--nworkers" "Amount of worker threads to start"
              :default (.availableProcessors (Runtime/getRuntime))
              :parse-fn #(Integer. %)]
             ["-m" "--method" "R method name" :default "echo"]
             ["-p" "--packages" "Comma seperated list of additional R packages to load"
              :parse-fn #(split % #",\s?")]
             ["-f" "--file" "R file to execute" :default "resources-dev/pirate/echo.R"])
        {:keys [file packages rserve
                nworkers method]} options]
    (when (:help options)
      (println banner)
      (System/exit 0))
    (pirate/initialize file packages rserve)
    (Thread/sleep 5000)
    (reset! script-file file)
    (dotimes [_n nworkers]
      (log/info "[main] started worker for" method)
      (amqp/start method @script-file (partial pirate/execute method)))
    (while true (Thread/sleep 100))))
