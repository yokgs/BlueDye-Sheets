import { TextCaseConverter } from "../common/TextCaseConverter";
import { DyeRuntime } from "../core/DyeRuntime";
import { DyeScopeWrapper } from "../data/DyeScopeWrapper";
import { ParsedSource } from "../parser/Parser";
import { Store } from "../store/store";
import { VariableNameValidator } from "../validator/VariableNameValidator";

export class DyeInterpreter {

    private readonly variable = /&[a-zA-Z][a-zA-Z0-9/]*/;
    private readonly classQuery = /^\$[a-zA-Z][a-zA-Z0-9-]*$/;

    private store: Store;
    private scope: DyeScopeWrapper;
    private runtime: DyeRuntime;

    constructor(store: Store, runtime: DyeRuntime) {
        this.store = store;
        this.scope = new DyeScopeWrapper(this.store.scopeManager.getActiveScope());
        this.runtime = runtime;
    }

    public evaluate(statment: string) {
        if (this.variable.test(statment))
            return this.scope.get(statment.slice(1));
        return statment;
    }

    public interpret(statment: ParsedSource) {
        try {
            this.interpretStatment(statment);
        } catch (e: any) {
            this.runtime.logger.error(e.message, "DyeInterpreter", "current file", statment.index);
        }
    }

    private interpretStatment(statment: ParsedSource) {
        let [query, ...queue] = statment.content.map(s => this.evaluate(s));

        if (this.classQuery.test(query)) {
            this.applyClass(query, queue);
            return;
        }

        switch (query) {
            case '@':
            case 'var':
                this.defineVariables(queue);
                break;
            case '!@':
            case 'default':
                this.defineDefaultVariables(queue);
                break;
            case '#':
            case 'scope':
                this.defineScope(queue);
                break;
            case '$':
            case 'style':
                this.defineStyle(queue);
                break;
            case '.$':
            case 'class':
                this.defineClass(queue);
                break;
            case '@@':
            case 'import':
                this.importModule(queue);
                break;
            case '<=':
            case 'expose':
                this.exposeToModule(queue);
                break;
            case '=>':
            case 'export':
                this.exportToInvoker(queue);
                break;
            case '!type':
                this.setType(queue);
                break;
            case '!dyegest':
                this.enableDyeGestMode();
                break;
            case '!version':
                this.checkSupport(queue[0]);
                break;
        }
    }

    private enableDyeGestMode() {
        this.runtime.enableStrictMode();
        this.runtime.enableDyeGestMode();
    }

    private checkSupport(version: string) {
        let thisVersion = DyeRuntime.version;
        if (version !== thisVersion) console.log("This file was degisted by diffrent version of DyeScript. It may not work as it suppose. try digest the source file using DyeScript version " + thisVersion)
    }

    setType(queue: string[]) {
        let type = "implicit";

        /** 
         * @todo add type validation
         */
        if (queue.length > 0)
            type = queue[0];

        this.scope.setType(type);
    }

    private applyClass(query: string, targets: string[]) {
        let className = query.slice(1);
        for (let target of targets) {
            if (this.classQuery.test(target))
                this.scope.extendClass(target.slice(1), className);
            else
                this.scope.applyClass(target, className);
        }
    }

    exportToInvoker(queue: any[]) {
        throw new Error("Method not implemented.");
    }

    exposeToModule(queue: any[]) {
        throw new Error("Method not implemented.");
    }

    importModule(queue: any[]) {
        throw new Error("Method not implemented.");
    }

    defineClass(statment: string[]) {
        let selectors = statment[0].split(",");
        for (let i = 1; i < statment.length; i += 2) {
            let properties = statment[i].split(",");
            for (let property of properties) {
                const camelCaseProperty = TextCaseConverter.toCamelCase(property);
                let value = statment[i + 1];
                this.store.addStyle(selectors, camelCaseProperty, value);
            }
        }
    }

    private defineDefaultVariables(statment: string[]) {
        for (let i = 0; i < statment.length; i += 2) {
            let name = statment[i];
            let value = statment[i + 1];
            this.scope.setDefault(name, value);
        }
    }

    private defineStyle(statment: string[]) {
        let selectors = statment[0].split(",");
        for (let i = 1; i < statment.length; i += 2) {
            let properties = statment[i].split(",");
            for (let property of properties) {
                const camelCaseProperty = TextCaseConverter.toCamelCase(property);
                let value = statment[i + 1];
                this.store.addStyle(selectors, camelCaseProperty, value);
            }
        }
    }

    private defineVariables(statment: string[]) {
        for (let i = 0; i < statment.length; i += 2) {

            let name = statment[i];
            new VariableNameValidator().isValid(name);

            let value = statment[i + 1];
            this.scope.set(name, value);
        }
    }

    private defineScope(statment: string[]) {
        this.scope.update(this.store.activateCollection(statment[0]));
        this.store.scopeManager.loadCollections(statment.slice(1))
    }

    public process(statments: ParsedSource[]): Store {
        for (let statment of statments) {
            this.interpret(statment);
        }
        return this.store;
    }

}