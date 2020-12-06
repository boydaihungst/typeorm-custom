"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var CannotAttachTreeChildrenEntityError_1 = require("../../error/CannotAttachTreeChildrenEntityError");
var OrmUtils_1 = require("../../util/OrmUtils");
/**
 * Executes subject operations for closure entities.
 */
var ClosureSubjectExecutor = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function ClosureSubjectExecutor(queryRunner) {
        this.queryRunner = queryRunner;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Executes operations when subject is being inserted.
     */
    ClosureSubjectExecutor.prototype.insert = function (subject) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var closureJunctionInsertMap, parent;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        closureJunctionInsertMap = {};
                        subject.metadata.closureJunctionTable.ancestorColumns.forEach(function (column) {
                            closureJunctionInsertMap[column.databaseName] = subject.identifier;
                        });
                        subject.metadata.closureJunctionTable.descendantColumns.forEach(function (column) {
                            closureJunctionInsertMap[column.databaseName] = subject.identifier;
                        });
                        // insert values into the closure junction table
                        return [4 /*yield*/, this.queryRunner
                                .manager
                                .createQueryBuilder()
                                .insert()
                                .into(subject.metadata.closureJunctionTable.tablePath)
                                .values(closureJunctionInsertMap)
                                .updateEntity(false)
                                .callListeners(false)
                                .execute()];
                    case 1:
                        // insert values into the closure junction table
                        _a.sent();
                        parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity);
                        if (!parent && subject.parentSubject && subject.parentSubject.entity) // if entity was attached via children
                            parent = subject.parentSubject.insertedValueSet ? subject.parentSubject.insertedValueSet : subject.parentSubject.entity;
                        if (!parent) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.insertClosureEntry(subject, subject.entity, parent)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes operations when subject is being updated.
     */
    ClosureSubjectExecutor.prototype.update = function (subject) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var parent, entity, oldParent, oldParentId, parentId, escape, previousParent, hasPreviousParent, closureTable_1, ancestorColumnNames_1, descendantColumnNames_1, createSubQuery_1, parameters, _a, _b, column, queryParams_1, tableName, superAlias_1, subAlias_1, select, entityWhereCondition, parentWhereCondition;
            var e_1, _c;
            var _this = this;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity);
                        if (!parent && subject.parentSubject && subject.parentSubject.entity) // if entity was attached via children
                            parent = subject.parentSubject.entity;
                        entity = subject.databaseEntity;
                        if (!entity) // if entity was attached via children
                            entity = subject.metadata.treeChildrenRelation.getEntityValue(parent).find(function (child) {
                                return Object.entries(subject.identifier).every(function (_a) {
                                    var _b = tslib_1.__read(_a, 2), key = _b[0], value = _b[1];
                                    return child[key] === value;
                                });
                            });
                        // Exit if the parent or the entity where never set
                        if (entity === undefined || parent === undefined) {
                            return [2 /*return*/];
                        }
                        oldParent = subject.metadata.treeParentRelation.getEntityValue(entity);
                        oldParentId = subject.metadata.getEntityIdMap(oldParent);
                        parentId = subject.metadata.getEntityIdMap(parent);
                        // Exit if the new and old parents are the same
                        if (OrmUtils_1.OrmUtils.compareIds(oldParentId, parentId)) {
                            return [2 /*return*/];
                        }
                        escape = function (alias) { return _this.queryRunner.connection.driver.escape(alias); };
                        previousParent = subject.metadata.treeParentRelation.getEntityValue(entity);
                        hasPreviousParent = subject.metadata.primaryColumns.some(function (column) { return column.getEntityValue(previousParent) != null; });
                        if (!hasPreviousParent) return [3 /*break*/, 4];
                        closureTable_1 = subject.metadata.closureJunctionTable;
                        ancestorColumnNames_1 = closureTable_1.ancestorColumns.map(function (column) {
                            return escape(column.databaseName);
                        });
                        descendantColumnNames_1 = closureTable_1.descendantColumns.map(function (column) {
                            return escape(column.databaseName);
                        });
                        createSubQuery_1 = function (qb, alias) {
                            var e_2, _a;
                            var subAlias = "sub" + alias;
                            var subSelect = qb.createQueryBuilder()
                                .select(descendantColumnNames_1.join(", "))
                                .from(closureTable_1.tablePath, subAlias);
                            try {
                                // Create where conditions e.g. (WHERE "subdescendant"."id_ancestor" = :value_id)
                                for (var _b = tslib_1.__values(closureTable_1.ancestorColumns), _c = _b.next(); !_c.done; _c = _b.next()) {
                                    var column = _c.value;
                                    subSelect.andWhere(escape(subAlias) + "." + escape(column.databaseName) + " = :value_" + column.referencedColumn.databaseName);
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                            return qb.createQueryBuilder()
                                .select(descendantColumnNames_1.join(", "))
                                .from("(" + subSelect.getQuery() + ")", alias)
                                .setParameters(subSelect.getParameters())
                                .getQuery();
                        };
                        parameters = {};
                        try {
                            for (_a = tslib_1.__values(subject.metadata.primaryColumns), _b = _a.next(); !_b.done; _b = _a.next()) {
                                column = _b.value;
                                parameters["value_" + column.databaseName] = entity[column.databaseName];
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [4 /*yield*/, this.queryRunner
                                .manager
                                .createQueryBuilder()
                                .delete()
                                .from(closureTable_1.tablePath)
                                .where(function (qb) { return "(" + descendantColumnNames_1.join(", ") + ") IN (" + createSubQuery_1(qb, "descendant") + ")"; })
                                .andWhere(function (qb) { return "(" + ancestorColumnNames_1.join(", ") + ") NOT IN (" + createSubQuery_1(qb, "ancestor") + ")"; })
                                .setParameters(parameters)
                                .execute()];
                    case 1:
                        _d.sent();
                        if (!parent) return [3 /*break*/, 3];
                        queryParams_1 = [];
                        tableName = this.getTableName(closureTable_1.tablePath);
                        superAlias_1 = escape("supertree");
                        subAlias_1 = escape("subtree");
                        select = tslib_1.__spread(ancestorColumnNames_1.map(function (columnName) { return superAlias_1 + "." + columnName; }), descendantColumnNames_1.map(function (columnName) { return subAlias_1 + "." + columnName; }));
                        entityWhereCondition = subject.metadata.primaryColumns.map(function (column) {
                            var columnName = escape(column.databaseName + "_ancestor");
                            var entityId = column.getEntityValue(entity);
                            queryParams_1.push(entityId);
                            var parameterName = _this.queryRunner.connection.driver.createParameter("entity_" + column.databaseName, queryParams_1.length - 1);
                            return subAlias_1 + "." + columnName + " = " + parameterName;
                        });
                        parentWhereCondition = subject.metadata.primaryColumns.map(function (column) {
                            var columnName = escape(column.databaseName + "_descendant");
                            var parentId = column.getEntityValue(parent);
                            if (!parentId)
                                throw new CannotAttachTreeChildrenEntityError_1.CannotAttachTreeChildrenEntityError(subject.metadata.name);
                            queryParams_1.push(parentId);
                            var parameterName = _this.queryRunner.connection.driver.createParameter("parent_entity_" + column.databaseName, queryParams_1.length - 1);
                            return superAlias_1 + "." + columnName + " = " + parameterName;
                        });
                        return [4 /*yield*/, this.queryRunner.query("INSERT INTO " + tableName + " (" + tslib_1.__spread(ancestorColumnNames_1, descendantColumnNames_1).join(", ") + ") " +
                                ("SELECT " + select.join(", ") + " ") +
                                ("FROM " + tableName + " AS " + superAlias_1 + ", " + tableName + " AS " + subAlias_1 + " ") +
                                ("WHERE " + tslib_1.__spread(entityWhereCondition, parentWhereCondition).join(" AND ")), queryParams_1)];
                    case 2:
                        _d.sent();
                        _d.label = 3;
                    case 3: return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this.insertClosureEntry(subject, entity, parent)];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Inserts the rows into the closure table for a given entity
     */
    ClosureSubjectExecutor.prototype.insertClosureEntry = function (subject, entity, parent) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var escape, tableName, queryParams, ancestorColumnNames, descendantColumnNames, childEntityIds1, whereCondition;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        escape = function (alias) { return _this.queryRunner.connection.driver.escape(alias); };
                        tableName = this.getTableName(subject.metadata.closureJunctionTable.tablePath);
                        queryParams = [];
                        ancestorColumnNames = subject.metadata.closureJunctionTable.ancestorColumns.map(function (column) {
                            return escape(column.databaseName);
                        });
                        descendantColumnNames = subject.metadata.closureJunctionTable.descendantColumns.map(function (column) {
                            return escape(column.databaseName);
                        });
                        childEntityIds1 = subject.metadata.primaryColumns.map(function (column) {
                            queryParams.push(column.getEntityValue(subject.insertedValueSet ? subject.insertedValueSet : entity));
                            return _this.queryRunner.connection.driver.createParameter("child_entity_" + column.databaseName, queryParams.length - 1);
                        });
                        whereCondition = subject.metadata.primaryColumns.map(function (column) {
                            var columnName = escape(column.databaseName + "_descendant");
                            var parentId = column.getEntityValue(parent);
                            if (!parentId)
                                throw new CannotAttachTreeChildrenEntityError_1.CannotAttachTreeChildrenEntityError(subject.metadata.name);
                            queryParams.push(parentId);
                            var parameterName = _this.queryRunner.connection.driver.createParameter("parent_entity_" + column.databaseName, queryParams.length - 1);
                            return columnName + " = " + parameterName;
                        });
                        return [4 /*yield*/, this.queryRunner.query("INSERT INTO " + tableName + " (" + tslib_1.__spread(ancestorColumnNames, descendantColumnNames).join(", ") + ") " +
                                ("SELECT " + ancestorColumnNames.join(", ") + ", " + childEntityIds1.join(", ") + " FROM " + tableName + " WHERE " + whereCondition.join(" AND ")), queryParams)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gets escaped table name with schema name if SqlServer or Postgres driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    ClosureSubjectExecutor.prototype.getTableName = function (tablePath) {
        var _this = this;
        return tablePath.split(".")
            .map(function (i) {
            // this condition need because in SQL Server driver when custom database name was specified and schema name was not, we got `dbName..tableName` string, and doesn't need to escape middle empty string
            return i === "" ? i : _this.queryRunner.connection.driver.escape(i);
        }).join(".");
    };
    return ClosureSubjectExecutor;
}());
exports.ClosureSubjectExecutor = ClosureSubjectExecutor;

//# sourceMappingURL=ClosureSubjectExecutor.js.map
