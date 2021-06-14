(ns patavi.worker.pirate.core
  (:require [cheshire.core :refer [encode]]
            [clojure.java.io :as io]
            [clojure.string :refer [join]]
            [clojure.tools.logging :as log]
            [crypto.random :as crypto]
            [environ.core :refer [env]]
            [me.raynes.fs :as fs]
            [patavi.worker.pirate.util :as pirate])
  (:import (org.rosuda.REngine REngineException)
           (org.rosuda.REngine.Rserve RConnection)))

(def ^:private script-file (atom nil))

(def ^:private default-packages ["Rserve" "RJSONIO" "base64enc" "Cairo"])

(def ^:private load-template
  (str "l = tryCatch(require('%1$s'), warning=function(w) w);"
       "if(is(l, 'warning')) print(l[1])"))

(def ^:private bootstrap-template "#AUTO-GENERATED\nsource('%s')\n")

(defn- create-bootstrap
  [extra-packages wrapper]
  (let [packages (concat extra-packages default-packages)
        commands (map #(format load-template %) packages)]
    (str (format bootstrap-template (fs/absolute-path wrapper)) (join "\n" commands))))

(def ^:private start-cmd
  "R CMD Rserve --RS-conf %1$s --vanilla > %2$s 2>&1 &")

(defn- make-cmd
  [config-file]
  (let [log-dir (fs/expand-home (env :rserve-logs))
        config-path (fs/absolute-path config-file)
        executable (fs/temp-file "rserve")]
    (io/copy (format start-cmd config-path log-dir) executable)
    (fs/chmod "u+x" executable)
    executable))

(defn- start-server
  [packages]
  (let [[bootstrap
         wrapper
         config-file] (map fs/temp-file ["bootstrap" "wrapper" "config"])]
    (io/copy (slurp (io/resource "wrap.R")) wrapper)
    (io/copy (create-bootstrap packages wrapper) bootstrap)
    (io/copy (slurp (io/resource "Rserve.conf")) config-file)
    (spit config-file (str "source " (fs/absolute-path bootstrap)) :append true)
    (fs/exec (fs/absolute-path (make-cmd config-file)))))

(defn initialize
  "Generates a bootstrap.R file and executes scripts/start.sh in a shell
   Typically starting a new RServe with the generated file 'sourced'"
  [file packages start?]
  (reset! script-file (io/as-file file))
  (when start?
    (start-server packages)))

(defn- source-script!
  "Finds the R file with the associated file
   name and load its into an RConnection."
  [^RConnection R script]
  (let [filename (crypto.random/hex 8)]
    (if (nil? script)
      (throw (IllegalArgumentException.
              (str "Could not source script file to R")))
      (do
        (pirate/copy! R script filename)
        (.voidEval R (str "source('" filename "')"))
        (.removeFile R filename)))))

(defn- cause
  [^Exception e]
  (let [cause (.getCause e)]
    (if (and (not (nil? e)) (instance? REngineException cause))
      (.getMessage cause)
      (str e))))

(defn execute
  "Executes, in R, the method present in the file with the given params.
   Callback is function taking one argument which can serve to
   allow OOB updates from the R session
   See resources/wrap.R for details."
  [method params callback]
  (with-open [R (pirate/connect callback)]
    (try
      (source-script! R @script-file)
      (pirate/assign R "params" (encode params))
      (pirate/assign R "files" [])
      (let [call (format "exec(%s, params)" method)
            result (pirate/parse R call)
            files (pirate/retrieve R "files")]
        {:index result
         :files (doall (map (fn [desc] (assoc (dissoc desc "file") "content" (pirate/read-and-unlink-file! R (desc "file")))) files))})
      (catch Exception e (do (log/error e) (throw (Exception. (cause e) e)))))))
