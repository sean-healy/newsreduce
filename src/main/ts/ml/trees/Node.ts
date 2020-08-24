import { GenericConstructor } from "types/GenericConstructor";

export abstract class Node<N extends Node<N>> extends GenericConstructor<N> {
    abstract isLeaf(): boolean;
}