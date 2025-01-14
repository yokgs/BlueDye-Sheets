import { TextCaseConverter } from "../common/TextCaseConverter";
import { IAnimation } from "../common/animation.interface";
import { IFont } from "../common/font.interface";
import { IStyle } from "../common/style.interface";
import { Store } from "../store/store";
import { CSSBuilder } from "./CSSBuilder";

export class MinCSSBuilder extends CSSBuilder {

    constructor() {
        super();
    }

    public build(store: Store): string {
        return super.build(store).replace(/;}/g, '}');
    }

    protected processMotions(motions: Map<string, IAnimation>): void {

        let motionBuffer = '';
        for (let motionKey in motions.keys()) {

            motionBuffer += `@keyframes ${motionKey}{`;
            let motion = motions.get(motionKey);
            for (let s in motion) {
                motionBuffer += `${s}{`;
                for (let p in motion[s]) {
                    motionBuffer += `${TextCaseConverter.toKebabCase(p)}:${motion[s][p]};`;
                }
                motionBuffer = motionBuffer.substring(0, motionBuffer.length - 1);
                motionBuffer += `}`;
            }
            motionBuffer += `}`;
        }

        if (motionBuffer.length > 0) {
            this.append(`@media (prefers-reduced-motion){`);
            this.append(motionBuffer + `}`);
        }
    }

    protected processAnimations(animations: Map<string, IAnimation>): void {
        for (let animationKey in animations.keys()) {
            this.append(`@keyframes ${animationKey}{`);
            for (let keyframe in animations.get(animationKey)) {

                this.append(`${keyframe}{`);
                let animation = animations.get(animationKey);
                if (typeof animation != "undefined") {
                    for (let property in animation[keyframe]) {
                        this.append(`${TextCaseConverter.toKebabCase(property)}:${animation[keyframe][property]};`);
                    }
                }
                this.append(`}`);
            }
            this.append(`}`);
        }
    }

    protected processStyles(styles: Map<string, IStyle>) {
        for (let el of styles.keys()) {
            this.append(`${el}{`);
            let style = styles.get(el);
            for (let p in style) {
                this.append(`${TextCaseConverter.toKebabCase(p)}:${this.getDominantStyle(style[p])};`);
            }
            this.append(`}`);
        }
    }

    processFonts(fonts: Map<string, IFont>) {
        for (let el in fonts.keys()) {
            let font = fonts.get(el);
            if (font)
                this.append(`@font-face{font-family:${el};src:url(${font.source})}`);
        }
    }

}